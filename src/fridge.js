import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { onAuthReady } from "./authentication.js";

let fridgeIngredients = []; // { id, name }

/**
 * Render ingredients into the list
 */
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
    li.className = "list-group-item d-flex justify-content-between align-items-center";

    li.textContent = item.name;

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-outline-danger btn-sm";
    removeBtn.textContent = "X";

    removeBtn.addEventListener("click", () => {
      fridgeIngredients = fridgeIngredients.filter((i) => i.id !== item.id);
      renderIngredientList();
    });

    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

/**
 * Add ingredient
 */
function addIngredient() {
  const input = document.getElementById("ingredient-input");
  if (!input) return;

  const name = input.value.trim();
  if (!name) return;

  fridgeIngredients.push({
    id: crypto.randomUUID(),
    name,
  });

  input.value = "";
  renderIngredientList();
}

/**
 * Setup handlers
 */
function setupHandlers() {
  const addBtn = document.getElementById("add-ingredient-btn");
  const input = document.getElementById("ingredient-input");

  if (addBtn) {
    addBtn.addEventListener("click", addIngredient);
  }

  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addIngredient();
    });
  }
}

/**
 * Protect page, then initialize
 */
function initFridge() {
  onAuthReady((user) => {
    if (!user) {
      location.href = "index.html";
      return;
    }

    setupHandlers();
    renderIngredientList();
  });
}

document.addEventListener("DOMContentLoaded", initFridge);
