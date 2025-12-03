// src/main.js
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
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = getFirestore();

//  REPLACE THIS with your actual fridge doc ID from Firestore
const PUBLIC_FRIDGE_ID = "XXXX"; // e.g. "AThzw3kBcRC5g8WT5xbf" or similar

let featuredRecipes = [];
let heroIndex = 0;
let currentFridgeId = PUBLIC_FRIDGE_ID;

/**
 * Update the hero section based on a single recipe object.
 */
function updateHero(recipe) {
  const heroBackdrop = document.getElementById("hero-backdrop");
  const heroRecipeText = document.getElementById("hero-recipe-text");
  const heroControls = document.getElementById("hero-controls");

  if (!heroBackdrop || !heroRecipeText || !heroControls) return;

  if (!recipe) {
    heroBackdrop.style.backgroundImage = "";
    heroRecipeText.textContent =
      "No recipes found in the public fridge yet.";
    heroControls.style.display = "none";
    return;
  }

  if (recipe.thumbnail) {
    heroBackdrop.style.backgroundImage = `url("${recipe.thumbnail}")`;
  } else {
    heroBackdrop.style.backgroundImage = "";
  }

  const parts = [];
  parts.push(recipe.name || "Untitled recipe");
  if (recipe.category) parts.push(`Category: ${recipe.category}`);
  if (recipe.area) parts.push(`Cuisine: ${recipe.area}`);

  heroRecipeText.textContent = parts.join(" • ");
  heroControls.style.display = featuredRecipes.length > 1 ? "flex" : "none";
}

/**
 * Build a recipe card for the grid.
 */
function createRecipeCard(recipe) {
  const card = document.createElement("article");
  card.className = "recipe-card";

  if (recipe.thumbnail) {
    const img = document.createElement("img");
    img.src = recipe.thumbnail;
    img.alt = recipe.name || "Recipe image";
    img.className = "recipe-card-img";
    card.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "recipe-card-body";

  const title = document.createElement("h3");
  title.textContent = recipe.name || "Untitled recipe";
  body.appendChild(title);

  const meta = document.createElement("p");
  const metaParts = [];
  if (recipe.category) metaParts.push(recipe.category);
  if (recipe.area) metaParts.push(recipe.area);
  meta.textContent = metaParts.join(" • ");
  body.appendChild(meta);

  // View recipe button – everyone uses the same PUBLIC_FRIDGE_ID
  const btn = document.createElement("a");
  btn.href = `/eachRecipe.html?fridgeId=${PUBLIC_FRIDGE_ID}&id=${recipe.id}`;
  btn.className = "btn btn-primary btn-sm";
  btn.textContent = "View recipe";
  body.appendChild(btn);

  card.appendChild(body);
  return card;
}

/**
 * Populate the recipe grid with recipes.
 */
function renderRecipesGrid(recipes) {
  const recipesGrid = document.getElementById("recipes-grid");
  if (!recipesGrid) return;

  recipesGrid.innerHTML = "";

  if (!recipes.length) {
    const msg = document.createElement("p");
    msg.textContent =
      "No recipes found in the public fridge yet.";
    recipesGrid.appendChild(msg);
    return;
  }

  recipes.forEach((recipe) => {
    const card = createRecipeCard(recipe);
    recipesGrid.appendChild(card);
  });
}

/**
 * Load recipes from the PUBLIC fridge's "recipes" subcollection.
 *   fridge/{PUBLIC_FRIDGE_ID}/recipes
 */
async function loadPublicFridgeRecipes() {
  try {
    const recipesCol = collection(db, "fridge", PUBLIC_FRIDGE_ID, "recipes");
    const q = query(recipesCol, orderBy("createdAt", "desc"), limit(20));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        idMeal: data.idMeal || null,
        name: data.name || "Untitled recipe",
        category: data.category || "",
        area: data.area || "",
        instructions: data.instructions || "",
        thumbnail: data.thumbnail || "",
        tags: data.tags || [],
        youtube: data.youtube || "",
      };
    });
  } catch (err) {
    console.error("Error loading recipes from public fridge:", err);
    return [];
  }
}

/**
 * Initialize hero + grid using recipes from PUBLIC_FRIDGE_ID.
 */
async function initRecipesUI() {
  const recipes = await loadPublicFridgeRecipes();

  featuredRecipes = recipes.slice(0, 5);
  heroIndex = 0;
  updateHero(featuredRecipes[0]);

  renderRecipesGrid(recipes);

  const prevBtn = document.getElementById("prevHero");
  const nextBtn = document.getElementById("nextHero");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!featuredRecipes.length) return;
      heroIndex =
        (heroIndex - 1 + featuredRecipes.length) % featuredRecipes.length;
      updateHero(featuredRecipes[heroIndex]);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!featuredRecipes.length) return;
      heroIndex = (heroIndex + 1) % featuredRecipes.length;
      updateHero(featuredRecipes[heroIndex]);
    });
  }
}

/**
 * Show dashboard:
 * - Ensures user is logged in
 * - Fills "Hello <name>" line
 * - Then shows public fridge recipes to everyone
 */
function showDashboard() {
  const nameElement = document.getElementById("name-goes-here");

  onAuthReady(async (user) => {
    if (!user) {
      location.href = "index.html";
      return;
    }

    const name = user.displayName || user.email;
    if (nameElement) {
      nameElement.textContent = `${name}!`;
    }

    await initRecipesUI();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  showDashboard();
});