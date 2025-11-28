import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { onAuthReady } from "./authentication.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = getFirestore();

// In-memory list: { id, name, source: manual | auto }
let fridgeIngredients = [];
let currentUserUid = null;

// Top-level collection name in Firestore
const FRIDGE_COLLECTION = "fridgeIngredients";

/* -------------------- DOM RENDERING -------------------- */

function renderIngredientList() {
  const list = document.getElementById("ingredient-list");
  if (!list) return;

  list.innerHTML = "";

  if (fridgeIngredients.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item text-muted";
    li.textContent = "No ingredients added yet.";
    list.appendChild(li);
    return;
  }

  fridgeIngredients.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";

    li.textContent = item.name;

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-outline-danger btn-sm";
    removeBtn.textContent = "X";

    removeBtn.addEventListener("click", () => {
      removeFridgeItem(item.id);
    });

    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

/* -------------------- FIRESTORE HELPERS -------------------- */

// Get all fridgeIngredients docs for THIS user
async function loadUserFridgeIngredients(uid) {
  const colRef = collection(db, FRIDGE_COLLECTION);
  const qUser = query(colRef, where("userId", "==", uid));
  const snap = await getDocs(qUser);

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const name = (data.name || "").trim();
    if (!name) return;

    fridgeIngredients.push({
      id: docSnap.id,     // Firestore doc id
      name,
      source: "manual",
    });
  });
}

// Save a single ingredient for this user
async function saveIngredientToFirestore(name) {
  if (!currentUserUid) return null;
  const colRef = collection(db, FRIDGE_COLLECTION);
  const docRef = await addDoc(colRef, {
    userId: currentUserUid,
    name,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Delete a manual ingredient doc
async function deleteIngredientFromFirestore(id) {
  const ref = doc(db, FRIDGE_COLLECTION, id);
  await deleteDoc(ref);
}

/* -------------------- AUTO INGREDIENTS FROM RECIPES -------------------- */

async function fetchIngredientsFromMealDb(idMeal) {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(
        idMeal
      )}`
    );
    const data = await res.json();
    if (!data.meals || !data.meals[0]) {
      return [];
    }
    const meal = data.meals[0];
    const names = [];

    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      if (ing && ing.trim()) {
        names.push(ing.trim());
      }
    }

    return names;
  } catch (err) {
    console.error("Error fetching ingredients from TheMealDB:", err);
    return [];
  }
}

async function loadIngredientsFromRecipes() {
  const statusEl = document.getElementById("fridge-status");
  if (statusEl) {
    statusEl.textContent = "Loading ingredients from your latest recipes...";
  }

  try {
    const recipesCol = collection(db, "recipes");
    const qRecipes = query(recipesCol, orderBy("createdAt", "desc"), limit(10));
    const snapshot = await getDocs(qRecipes);

    const existingLower = new Set(
      fridgeIngredients.map((i) => i.name.toLowerCase())
    );

    const tasks = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();

      // If add data.ingredients array in recipes:
      if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        data.ingredients.forEach((ing) => {
          const name = (ing.name || "").trim();
          if (name && !existingLower.has(name.toLowerCase())) {
            existingLower.add(name.toLowerCase());
            fridgeIngredients.push({
              id: crypto.randomUUID(), // client-only id
              name,
              source: "auto",
            });
          }
        });
        return;
      }

      // fallback to TheMealDB using idMeal
      if (data.idMeal) {
        const names = await fetchIngredientsFromMealDb(data.idMeal);
        names.forEach((name) => {
          if (!existingLower.has(name.toLowerCase())) {
            existingLower.add(name.toLowerCase());
            fridgeIngredients.push({
              id: crypto.randomUUID(), // client-only id
              name,
              source: "auto",
            });
          }
        });
      }
    });

    await Promise.all(tasks);

    if (statusEl) {
      if (fridgeIngredients.length > 0) {
        statusEl.textContent = `Loaded ${fridgeIngredients.length} unique ingredients (from your saved fridge + latest recipes).`;
      } else {
        statusEl.textContent =
          "No ingredients found yet. You can still add ingredients manually.";
      }
    }

    renderIngredientList();
  } catch (err) {
    console.error("Error loading ingredients from recipes:", err);
    if (statusEl) {
      statusEl.textContent =
        "Error loading ingredients from recipes. You can still add ingredients manually.";
    }
  }
}

/* -------------------- ADD OR REMOVE -------------------- */

async function addIngredient() {
  const input = document.getElementById("ingredient-input");
  if (!input) return;

  const name = input.value.trim();
  if (!name) return;

  const exists = fridgeIngredients.some(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    input.value = "";
    return;
  }

  let newId = null;
  try {
    newId = await saveIngredientToFirestore(name);
  } catch (err) {
    console.error("Error saving ingredient:", err);
  }

  fridgeIngredients.push({
    id: newId || crypto.randomUUID(),
    name,
    source: "manual",
  });

  input.value = "";
  renderIngredientList();
}

async function removeFridgeItem(id) {
  const item = fridgeIngredients.find((i) => i.id === id);

  fridgeIngredients = fridgeIngredients.filter((i) => i.id !== id);
  renderIngredientList();

  if (item && item.source === "manual" && item.id) {
    try {
      await deleteIngredientFromFirestore(item.id);
    } catch (err) {
      console.error("Error deleting ingredient from Firestore:", err);
    }
  }
}

/* -------------------- INIT -------------------- */

function setupHandlers() {
  const addBtn = document.getElementById("add-ingredient-btn");
  const input = document.getElementById("ingredient-input");

  if (addBtn) {
    addBtn.addEventListener("click", addIngredient);
  }

  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        addIngredient();
      }
    });
  }
}

function initFridge() {
  onAuthReady(async (user) => {
    if (!user) {
      location.href = "index.html";
      return;
    }

    currentUserUid = user.uid;

    setupHandlers();

    // 1) Load saved manual ingredients from top-level fridgeIngredients collection
    await loadUserFridgeIngredients(currentUserUid);

    // 2) Then load auto ingredients from recipes
    await loadIngredientsFromRecipes();
  });
}

document.addEventListener("DOMContentLoaded", initFridge);
