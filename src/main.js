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
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = getFirestore();

//  REPLACE THIS with your actual fridge doc ID from Firestore
const PUBLIC_FRIDGE_ID = "XXXX"; // e.g. "AThzw3kBcRC5g8WT5xbf" or similar

let featuredRecipes = [];
let heroIndex = 0;
let currentFridgeId = PUBLIC_FRIDGE_ID;

// --- NEW: bookmark state in memory ---
let currentUserId = null;
let userBookmarks = new Set();

/**
 * Bookmark key format (must match your eachrecipe.js):
 *   fridge:<fridgeId>:<recipeId>
 * (and optionally recipe:<recipeId> if you ever use global recipes)
 */
function buildBookmarkKey(fridgeId, recipeId) {
  if (!recipeId) return null;

  if (fridgeId) {
    return `fridge:${fridgeId}:${recipeId}`;
  }
  return `recipe:${recipeId}`;
}

function isRecipeBookmarked(fridgeId, recipeId) {
  const key = buildBookmarkKey(fridgeId, recipeId);
  if (!key) return false;
  return userBookmarks.has(key);
}

/**
 * Load the logged-in user's bookmarks from Firestore into userBookmarks.
 * Assumes a document:
 *   users/{uid}.bookmarks = [ "fridge:...:...", "fridge:...:..." ]
 */
async function loadUserBookmarks(user) {
  if (!user) {
    userBookmarks = new Set();
    return;
  }

  currentUserId = user.uid;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      userBookmarks = new Set();
      return;
    }

    const data = snap.data();
    const arr = Array.isArray(data.bookmarks) ? data.bookmarks : [];
    userBookmarks = new Set(arr);
  } catch (err) {
    console.error("Error loading user bookmarks:", err);
    userBookmarks = new Set();
  }
}

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
  card.className = "recipe-card position-relative";

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

  // ----- BOOKMARK INDICATOR -----
  // Only show this if the recipe is actually bookmarked in Firestore
  const bookmarked = isRecipeBookmarked(currentFridgeId, recipe.id);
  if (bookmarked) {
    const indicator = document.createElement("i");
    indicator.className = "bi bi-bookmark-fill recipe-bookmark-indicator";
    indicator.dataset.key = buildBookmarkKey(currentFridgeId, recipe.id);
    indicator.title = "Bookmarked";

    // position bottom-right
    indicator.style.position = "absolute";
    indicator.style.bottom = "10px";
    indicator.style.right = "10px";
    indicator.style.fontSize = "1.5rem";
    indicator.style.color = "#0d6efd";

    card.appendChild(indicator);
  }

  // ----- VIEW RECIPE BUTTON -----
  const btn = document.createElement("a");
  btn.href = `/eachrecipe.html?fridgeId=${currentFridgeId}&id=${recipe.id}`;
  btn.className = "btn btn-primary btn-sm mt-2";
  btn.textContent = "View recipe";
  body.appendChild(btn);

  card.appendChild(body);
  return card;
}

/**
 * (Optional) helper to update icon after navigating back, if you ever need it.
 * Not strictly required right now, but left in case you hook it up later.
 */
async function updateRecipeCardBookmarkIndicator(recipeId, isBookmarked) {
  const key = buildBookmarkKey(currentFridgeId, recipeId);
  const icon = document.querySelector(
    `.recipe-bookmark-indicator[data-key="${key}"]`
  );

  if (!icon) return;

  if (isBookmarked) {
    icon.classList.add("bi-bookmark-fill", "bookmarked");
  } else {
    icon.classList.remove("bi-bookmark-fill", "bookmarked");
  }
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
 * - Loads user bookmarks
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

    // Load bookmarks from users/{uid} first
    await loadUserBookmarks(user);

    // Then render hero + grid using those bookmarks
    await initRecipesUI();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  showDashboard();
});