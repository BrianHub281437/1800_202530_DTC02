// src/fridge.js
// -------------------------------------------------------------
// Fridge page:
// - Loads a MealDB recipe (?id= or random)
// - Ingredient: dropdown with filter (from recipe)
// - Quantity: text input
// - Measurement: dropdown (units from recipe)
// - Adds selected ingredient + quantity + measurement to a list
// - Syncs list with Firestore per user:
//      users/{uid}/fridgeIngredients/{docId}
// -------------------------------------------------------------

import { auth, db } from "./app.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

console.log("fridge.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  // UI references
  const dropdownButton = document.getElementById("ingredientDropdownButton");
  const dropdownMenu = document.getElementById("ingredients-dropdown-menu");
  const filterInput = document.getElementById("ingredient-filter");
  const quantityInput = document.getElementById("quantity-input");
  const measurementSelect = document.getElementById("measurement-select");
  const addButton = document.getElementById("add-ingredient-btn");
  const ingredientsList = document.getElementById("ingredients-list");

  let mealIngredients = [];   // [{ ingredient, measure, quantity, unit }]
  let selectedIngredient = null;
  let currentUser = null;

  // -----------------------------------------------------------
  // Firestore helpers
  // -----------------------------------------------------------
  function getFridgeCollectionRef() {
    if (!currentUser) return null;
    return collection(db, "users", currentUser.uid, "fridgeIngredients");
  }

  async function loadFridgeFromFirestore() {
    const fridgeCol = getFridgeCollectionRef();
    if (!fridgeCol) return;

    const snapshot = await getDocs(fridgeCol);
    ingredientsList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const ingredientName = data.ingredient || "";
      const quantity = data.quantity || "";
      const unit = data.unit || "";

      let label = ingredientName;
      if (quantity && unit) {
        label = `${ingredientName} — ${quantity} ${unit}`;
      } else if (quantity) {
        label = `${ingredientName} — ${quantity}`;
      }

      const li = createListItem(label);
      li.dataset.docId = docSnap.id;
      ingredientsList.appendChild(li);
    });
  }

  async function saveIngredientToFirestore(ingredientName, quantity, unit) {
    const fridgeCol = getFridgeCollectionRef();
    if (!fridgeCol) return null;

    const docRef = await addDoc(fridgeCol, {
      ingredient: ingredientName,
      quantity,
      unit,
      createdAt: serverTimestamp(),
    });

    return docRef;
  }

  async function deleteIngredientFromFirestore(docId) {
    if (!currentUser || !docId) return;
    const ref = doc(db, "users", currentUser.uid, "fridgeIngredients", docId);
    await deleteDoc(ref);
  }

  // -----------------------------------------------------------
  // URL helper: ?id=MEAL_ID
  // -----------------------------------------------------------
  function getMealIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  // -----------------------------------------------------------
  // MealDB fetch helpers
  // -----------------------------------------------------------
  async function fetchMealById(idMeal) {
    const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.meals?.[0] ?? null;
  }

  async function fetchRandomMeal() {
    const url = "https://www.themealdb.com/api/json/v1/1/random.php";
    const res = await fetch(url);
    const data = await res.json();
    return data.meals?.[0] ?? null;
  }

  // -----------------------------------------------------------
  // Extract & parse ingredients from MealDB
  // -----------------------------------------------------------
  function parseMeasure(measureStr) {
    if (!measureStr) return { quantity: "", unit: "" };

    const trimmed = measureStr.trim();
    if (!trimmed) return { quantity: "", unit: "" };

    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      // example: "clove", "sprig"
      return { quantity: "", unit: trimmed };
    }

    const quantity = parts[0];              // e.g. "1", "2", "1/2"
    const unit = parts.slice(1).join(" ");  // e.g. "cup", "tbsp olive oil"
    return { quantity, unit };
  }

  function extractIngredientsFromMeal(meal) {
    const ingredients = [];

    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ing && ing.trim()) {
        const { quantity, unit } = parseMeasure(measure || "");
        ingredients.push({
          ingredient: ing.trim(),
          measure: (measure || "").trim(),
          quantity,
          unit,
        });
      }
    }

    return ingredients;
  }

  // -----------------------------------------------------------
  // Ingredient dropdown with filter
  // -----------------------------------------------------------
  function populateIngredientDropdown(ingredients) {
    // Remove old ingredient items, keep filter + divider
    dropdownMenu
      .querySelectorAll("li[data-ingredient-item]")
      .forEach((li) => li.remove());

    ingredients.forEach((item, index) => {
      const label = item.measure
        ? `${item.ingredient} — ${item.measure}`
        : item.ingredient;

      const li = document.createElement("li");
      li.setAttribute("data-ingredient-item", "true");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dropdown-item";
      btn.textContent = label;
      btn.dataset.label = label.toLowerCase();
      btn.dataset.index = index.toString();

      btn.addEventListener("click", () => {
        selectedIngredient = mealIngredients[index];
        dropdownButton.textContent = selectedIngredient.ingredient;

        // Pre-fill quantity + measurement from recipe if available
        quantityInput.value = selectedIngredient.quantity || "";
        if (selectedIngredient.unit) {
          measurementSelect.value = selectedIngredient.unit;
        } else {
          measurementSelect.value = "";
        }
      });

      li.appendChild(btn);
      dropdownMenu.appendChild(li);
    });
  }

  // -----------------------------------------------------------
  // Measurement dropdown from units in recipe
  // -----------------------------------------------------------
  function populateMeasurementSelect(ingredients) {
    measurementSelect.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Select measurement";
    measurementSelect.appendChild(defaultOpt);

    const unitsSet = new Set();
    ingredients.forEach((item) => {
      if (item.unit && item.unit.length > 0) {
        unitsSet.add(item.unit);
      }
    });

    const units = Array.from(unitsSet);
    units.forEach((unit) => {
      const opt = document.createElement("option");
      opt.value = unit;
      opt.textContent = unit;
      measurementSelect.appendChild(opt);
    });
  }

  // Filter ingredient dropdown as user types
  filterInput.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();

    dropdownMenu
      .querySelectorAll("li[data-ingredient-item] .dropdown-item")
      .forEach((btn) => {
        const label = btn.dataset.label || "";
        const match = label.includes(query);
        btn.parentElement.style.display = match ? "" : "none";
      });
  });

  // -----------------------------------------------------------
  // List item creation / removal
  // -----------------------------------------------------------
  function createListItem(label) {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex align-items-center justify-content-between";

    const span = document.createElement("span");
    span.textContent = label;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-sm btn-outline-danger ms-2";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("data-remove-ingredient", "true");

    li.appendChild(span);
    li.appendChild(removeBtn);
    return li;
  }

  // Remove from list (and Firestore if logged in)
  ingredientsList.addEventListener("click", async (event) => {
    const removeBtn = event.target.closest("[data-remove-ingredient]");
    if (!removeBtn) return;

    const li = removeBtn.closest("li");
    if (!li) return;

    const docId = li.dataset.docId;
    li.remove();

    if (docId && currentUser) {
      try {
        await deleteIngredientFromFirestore(docId);
      } catch (err) {
        console.error("Failed to delete ingredient from Firestore:", err);
      }
    }
  });

  // -----------------------------------------------------------
  // Add ingredient (UI + Firestore)
  // -----------------------------------------------------------
  async function handleAddIngredient() {
    if (!selectedIngredient) {
      alert("Please select an ingredient from the dropdown first.");
      return;
    }

    const quantity = quantityInput.value.trim();
    const unit = measurementSelect.value;
    const ingredientName = selectedIngredient.ingredient;

    if (!quantity) {
      alert("Please enter a quantity.");
      return;
    }

    let label = ingredientName;
    if (quantity && unit) {
      label = `${ingredientName} — ${quantity} ${unit}`;
    } else if (quantity) {
      label = `${ingredientName} — ${quantity}`;
    }

    const li = createListItem(label);
    ingredientsList.appendChild(li);

    // Sync with Firestore if logged in
    if (!currentUser) {
      console.warn("User not logged in; ingredient only stored locally.");
    } else {
      try {
        const docRef = await saveIngredientToFirestore(
          ingredientName,
          quantity,
          unit
        );
        if (docRef) {
          li.dataset.docId = docRef.id;
        }
      } catch (err) {
        console.error("Failed to save ingredient to Firestore:", err);
      }
    }

    // Reset quantity (keep ingredient + measurement)
    quantityInput.value = "";
    quantityInput.focus();
  }

  addButton.addEventListener("click", handleAddIngredient);

  quantityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddIngredient();
    }
  });

  // -----------------------------------------------------------
  // Init: load MealDB recipe and build controls
  // -----------------------------------------------------------
  async function initMeal() {
    try {
      const idFromURL = getMealIdFromURL();
      const meal = idFromURL
        ? await fetchMealById(idFromURL)
        : await fetchRandomMeal();

      if (!meal) {
        console.error("No meal data found from TheMealDB.");
        return;
      }

      console.log("Loaded meal:", meal.strMeal);

      mealIngredients = extractIngredientsFromMeal(meal);
      console.log("Meal ingredients:", mealIngredients);

      populateIngredientDropdown(mealIngredients);
      populateMeasurementSelect(mealIngredients);
    } catch (err) {
      console.error("Error initializing MealDB data:", err);
    }
  }

  // -----------------------------------------------------------
  // Auth listener: when user logs in, load their fridge
  // -----------------------------------------------------------
  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;

    if (currentUser) {
      console.log("Logged in as:", currentUser.uid);
      await loadFridgeFromFirestore();
    } else {
      console.log("No user logged in; fridge changes are local only.");
      ingredientsList.innerHTML = "";
    }
  });

  // Start
  initMeal();
});
