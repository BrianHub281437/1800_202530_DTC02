import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { onAuthReady } from "./authentication.js";

// Firestore imports – using default app initialized in authentication.js
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Use the default Firebase app that authentication.js initialized
const db = getFirestore();

// We'll keep these in module scope so hero next/prev buttons can access them
let featuredRecipes = [];
let heroIndex = 0;

/**
 * Update the hero section based on a single recipe object.
 * Expects the following IDs in your HTML:
 *  - #hero-backdrop
 *  - #hero-recipe-text
 *  - #hero-controls (wrapper for prev/next buttons)
 */
function updateHero(recipe) {
  const heroBackdrop = document.getElementById("hero-backdrop");
  const heroRecipeText = document.getElementById("hero-recipe-text");
  const heroControls = document.getElementById("hero-controls");

  if (!heroBackdrop || !heroRecipeText || !heroControls) {
    // If those elements don't exist, quietly bail out.
    return;
  }

  if (!recipe) {
    heroBackdrop.style.backgroundImage = "";
    heroRecipeText.textContent = "No recipes found in your collection yet.";
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
 * Create a card element for a recipe to be placed in the grid.
 * Expects a container with id="recipes-grid" in your HTML.
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

  // Optional: link to a detail page
  const btn = document.createElement("a");
  // If you later build a details page, swap "#" with something like:
  // `/recipe.html?id=${recipe.idMeal || recipe.id}`
  btn.href = "#";
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
  if (!recipesGrid) {
    return;
  }

  recipesGrid.innerHTML = "";

  if (!recipes.length) {
    const msg = document.createElement("p");
    msg.textContent = "No recipes found in your Firebase collection yet.";
    recipesGrid.appendChild(msg);
    return;
  }

  recipes.forEach((recipe) => {
    const card = createRecipeCard(recipe);
    recipesGrid.appendChild(card);
  });
}

/**
 * Load recipes from Firestore "recipes" collection.
 * Assumes your docs look something like:
 * {
 *   idMeal: string,
 *   name: string,
 *   category: string,
 *   area: string,
 *   instructions: string,
 *   thumbnail: string,
 *   tags: string[],
 *   youtube: string,
 *   createdAt: Timestamp
 * }
 */
async function loadRecipesFromFirestore() {
  try {
    const recipesCol = collection(db, "recipes");
    // If you didn't set createdAt, you can remove orderBy + limit
    const q = query(recipesCol, orderBy("createdAt", "desc"), limit(20));
    const snapshot = await getDocs(q);

    const recipes = snapshot.docs.map((docSnap) => {
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

    return recipes;
  } catch (err) {
    console.error("Error loading recipes from Firestore:", err);
    return [];
  }
}

/**
 * Initialize the hero and grid using recipes from Firestore.
 */
async function initRecipesUI() {
  const recipes = await loadRecipesFromFirestore();

  // Use first few as "featured" for hero
  featuredRecipes = recipes.slice(0, 5);
  heroIndex = 0;
  updateHero(featuredRecipes[0]);

  // Populate grid with all recipes
  renderRecipesGrid(recipes);

  // Hook up hero prev/next if buttons exist
  const prevBtn = document.getElementById("prevHero");
  const nextBtn = document.getElementById("nextHero");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!featuredRecipes.length) return;
      heroIndex = (heroIndex - 1 + featuredRecipes.length) % featuredRecipes.length;
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
 * - Then initializes the recipes UI from Firestore
 */
function showDashboard() {
  const nameElement = document.getElementById("name-goes-here");

  onAuthReady(async (user) => {
    if (!user) {
      // If no user is signed in → redirect back to login page.
      location.href = "index.html";
      return;
    }

    // If a user is logged in:
    const name = user.displayName || user.email;

    if (nameElement) {
      nameElement.textContent = `${name}!`;
    }

    // Once we know the user is valid, load recipes UI
    await initRecipesUI();
  });
}

// On DOM ready, show dashboard (auth + recipes)
document.addEventListener("DOMContentLoaded", () => {
  showDashboard();
});
