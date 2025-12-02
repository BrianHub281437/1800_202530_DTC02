// src/main.js
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
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = getFirestore();

// Globals so hero + cards can use them
let featuredRecipes = [];
let heroIndex = 0;
let currentFridgeId = null;

/**
 * Update the hero section based on a single recipe object.
 * Expects:
 *  - #hero-backdrop
 *  - #hero-recipe-text
 *  - #hero-controls
 */
function updateHero(recipe) {
  const heroBackdrop = document.getElementById("hero-backdrop");
  const heroRecipeText = document.getElementById("hero-recipe-text");
  const heroControls = document.getElementById("hero-controls");

  if (!heroBackdrop || !heroRecipeText || !heroControls) {
    return;
  }

  if (!recipe) {
    heroBackdrop.style.backgroundImage = "";
    heroRecipeText.textContent =
      "No recipes found in your fridges yet. Add some recipes to a fridge.";
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
 * Expects a container with id="recipes-grid" in HTML.
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

  // View recipe button – include BOTH fridgeId and recipe id in URL
  const btn = document.createElement("a");
  btn.href = `/eachRecipe.html?fridgeId=${currentFridgeId}&id=${recipe.id}`;
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
      "No recipes found in any of your fridges yet. Add recipes to a fridge to see them here.";
    recipesGrid.appendChild(msg);
    return;
  }

  recipes.forEach((recipe) => {
    const card = createRecipeCard(recipe);
    recipesGrid.appendChild(card);
  });
}

/**
 * Load recipes from a specific fridge's "recipes" subcollection:
 *   fridge/{fridgeId}/recipes
 */
async function loadRecipesFromFridge(fridgeId) {
  if (!fridgeId) {
    console.warn("No fridgeId provided to loadRecipesFromFridge");
    return [];
  }

  try {
    const recipesCol = collection(db, "fridge", fridgeId, "recipes");
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
    console.error("Error loading recipes from fridge:", err);
    return [];
  }
}

/**
 * Find a fridge for this user that actually has recipes.
 * Looks through all fridge IDs in user.fridges and returns
 * the first one that has at least 1 recipe in fridge/{id}/recipes.
 */
async function findFridgeWithRecipesForUser(user) {
  if (!user) return null;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      console.warn("User document not found for:", user.uid);
      return null;
    }

    const data = snap.data();
    const fridges = data.fridges || [];

    if (!fridges.length) {
      console.warn("User has no fridges array.");
      return null;
    }

    // Try each fridge in order until we find one that has recipes
    for (const fridgeId of fridges) {
      const recipesCol = collection(db, "fridge", fridgeId, "recipes");
      const snapshot = await getDocs(query(recipesCol, limit(1)));

      if (!snapshot.empty) {
        console.log("Using fridge with recipes:", fridgeId);
        return fridgeId;
      }
    }

    // If we got here, none of the fridges had recipes
    console.warn("No fridges with recipes found for user.");
    return null;
  } catch (err) {
    console.error("Error finding fridge with recipes:", err);
    return null;
  }
}

/**
 * Initialize hero + grid using recipes from the first fridge
 * (in user.fridges) that actually has recipes.
 */
async function initRecipesUIForUser(user) {
  const statusEl = document.getElementById("hero-recipe-text");

  const fridgeId = await findFridgeWithRecipesForUser(user);

  if (!fridgeId) {
    console.warn("No fridge with recipes found for this user.");
    if (statusEl) {
      statusEl.textContent =
        "No recipes found in any of your fridges yet. Add recipes to a fridge to see them here.";
    }
    renderRecipesGrid([]);
    return;
  }

  currentFridgeId = fridgeId;

  const recipes = await loadRecipesFromFridge(fridgeId);

  // Use first few as "featured" for hero
  featuredRecipes = recipes.slice(0, 5);
  heroIndex = 0;
  updateHero(featuredRecipes[0]);

  // Populate grid with all recipes from this fridge
  renderRecipesGrid(recipes);

  // Hero prev/next
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
 * - Then initializes the recipes UI from a fridge that has recipes
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

    await initRecipesUIForUser(user);
  });
}

// On DOM ready, show dashboard (auth + recipes)
document.addEventListener("DOMContentLoaded", () => {
  showDashboard();
});