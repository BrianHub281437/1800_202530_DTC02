// src/fridge.js
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { onAuthReady } from "./authentication.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = getFirestore();

/**
 * Read fridgeId from ?docID=... in the URL
 */
function getFridgeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("docID");
}

/**
 * Render ingredients into the list with a remove button for each.
 */
function renderIngredients(fridgeId, ingredients) {
  const listEl = document.getElementById("ingredient-list");
  const statusEl = document.getElementById("fridge-status");

  if (!listEl) return;

  listEl.innerHTML = "";

  if (!ingredients.length) {
    if (statusEl) {
      statusEl.textContent =
        "No ingredients in this fridge yet. Add one above.";
    }
    return;
  }

  if (statusEl) {
    statusEl.textContent = `Ingredients in this fridge:`;
  }

  ingredients.forEach((ing) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = ing.name;
    li.appendChild(nameSpan);

    // Remove button on the right
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm btn-outline-danger";
    removeBtn.textContent = "Remove";

    removeBtn.addEventListener("click", async () => {
      const ok = confirm(`Remove "${ing.name}" from this fridge?`);
      if (!ok) return;

      try {
        await deleteDoc(
          doc(db, "fridge", fridgeId, "ingredients", ing.id)
        );
        li.remove();
      } catch (err) {
        console.error("Error removing ingredient:", err);
        alert("Could not remove ingredient.");
      }
    });

    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

/**
 * Load ingredients from fridge/{fridgeId}/ingredients
 */
async function loadIngredients(fridgeId) {
  const statusEl = document.getElementById("fridge-status");
  if (statusEl) {
    statusEl.textContent = "Loading ingredients from your fridge...";
  }

  try {
    const ingredientsCol = collection(db, "fridge", fridgeId, "ingredients");
    const q = query(ingredientsCol, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const ingredients = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data().name || "",
    }));

    renderIngredients(fridgeId, ingredients);
  } catch (err) {
    console.error("Error loading ingredients:", err);
    if (statusEl) {
      statusEl.textContent =
        "Error loading ingredients. Please refresh and try again.";
    }
  }
}

/**
 * Handle adding a new ingredient
 */
async function handleAddIngredient(fridgeId) {
  const inputEl = document.getElementById("ingredient-input");
  if (!inputEl) return;

  const name = inputEl.value.trim();
  if (!name) return;

  try {
    const ingredientsCol = collection(db, "fridge", fridgeId, "ingredients");
    await addDoc(ingredientsCol, {
      name,
      createdAt: serverTimestamp(),
    });

    inputEl.value = "";
    await loadIngredients(fridgeId);
  } catch (err) {
    console.error("Error adding ingredient:", err);
    alert("Could not add ingredient.");
  }
}

/**
 * Init fridge page: auth check + load + wire events.
 */
function initFridgePage() {
  onAuthReady(async (user) => {
    if (!user) {
      location.href = "index.html";
      return;
    }

    const fridgeId = getFridgeIdFromUrl();
    if (!fridgeId) {
      alert("No fridge ID provided in the URL.");
      return;
    }

    // initial load
    await loadIngredients(fridgeId);

    // add button
    const addBtn = document.getElementById("add-ingredient-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => handleAddIngredient(fridgeId));
    }

    // enter key on input
    const inputEl = document.getElementById("ingredient-input");
    if (inputEl) {
      inputEl.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          handleAddIngredient(fridgeId);
        }
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", initFridgePage);