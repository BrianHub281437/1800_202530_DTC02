// src/eachrecipe.js
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { onAuthReady } from "./authentication.js";

import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = getFirestore();

/**
 * Extract YouTube video ID from common URL formats.
 */
function extractYouTubeId(url) {
  if (!url) return null;

  try {
    const u = new URL(url);

    // https://www.youtube.com/watch?v=VIDEOID
    const vParam = u.searchParams.get("v");
    if (vParam) return vParam;

    // https://youtu.be/VIDEOID
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "");
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Render recipe data into the DOM.
 * Matches your eachRecipe.html IDs:
 *  - #recipe-title
 *  - #recipe-image
 *  - #recipe-meta
 *  - #ingredients-list
 *  - #instructions
 *  - #youtube-container
 */
function formatInstructions(text) {
  if (!text) return "<p>No instructions available.</p>";

  // Split into steps based on sentence endings OR line breaks
  const steps = text
    .split(/[\.\n]+/g)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Convert each step into an <li>
  return steps.map(step => `<li>${step}.</li>`).join("");
}

function renderRecipe(data) {
  const titleEl = document.getElementById("recipe-title");
  const imageEl = document.getElementById("recipe-image");
  const metaEl = document.getElementById("recipe-meta");
  const ingredientsList = document.getElementById("ingredients-list");
  const instructionsEl = document.getElementById("instructions");
  const youtubeContainer = document.getElementById("youtube-container");

  // Title
  if (titleEl) {
    titleEl.textContent = data.name || "Untitled recipe";
  }

  // Image
  if (imageEl) {
    if (data.thumbnail) {
      imageEl.src = data.thumbnail;
      imageEl.alt = data.name || "Recipe image";
      imageEl.style.display = "block";
    } else {
      imageEl.style.display = "none";
    }
  }

  // Meta (category • area)
  if (metaEl) {
    const parts = [];
    if (data.category) parts.push(data.category);
    if (data.area) parts.push(data.area);
    metaEl.textContent = parts.join(" • ") || "";
  }

  // Ingredients
  if (ingredientsList) {
    ingredientsList.innerHTML = "";

    const ingredientsArray = Array.isArray(data.ingredients)
      ? data.ingredients
      : [];

    if (!ingredientsArray.length) {
      const li = document.createElement("li");
      li.textContent = "No ingredients listed for this recipe.";
      ingredientsList.appendChild(li);
    } else {
      ingredientsArray.forEach((ing) => {
        const li = document.createElement("li");

        // Support both new & old formats:
        const name = (ing.name || ing.ingredient || "").trim();
        const measure = (ing.measure || "").trim();

        if (!name && !measure) return;

        if (measure && name) {
          li.textContent = `${measure} ${name}`;
        } else {
          li.textContent = name || measure;
        }

        ingredientsList.appendChild(li);
      });
    }
  }

  // Instructions
if (instructionsEl) {
  instructionsEl.innerHTML = "";

  const raw = data.instructions || "";
  if (!raw.trim()) {
    const li = document.createElement("li");
    li.textContent = "No instructions provided for this recipe.";
    instructionsEl.appendChild(li);
  } else {
    // Split on line breaks (TheMealDB often uses these)
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    lines.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;

      // If the line starts with "step 1", "step 2", etc. → bold, no bullet
      if (/^step\s*\d+/i.test(line)) {
        li.classList.add("step-heading");
      }

      instructionsEl.appendChild(li);
    });
  }
}

  // YouTube video
  if (youtubeContainer) {
    youtubeContainer.innerHTML = "";

    const videoId = extractYouTubeId(data.youtube);
    if (videoId) {
      const iframe = document.createElement("iframe");
      iframe.width = "560";
      iframe.height = "315";
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.title = "YouTube video player";
      iframe.frameBorder = "0";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;

      youtubeContainer.appendChild(iframe);
    } else {
      const p = document.createElement("p");
      p.textContent = "No YouTube video available for this recipe.";
      youtubeContainer.appendChild(p);
    }
  }
}

/**
 * Load recipe from:
 *   fridge/{fridgeId}/recipes/{recipeId}
 * using ?fridgeId=...&id=... in the URL.
 */
async function loadRecipeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fridgeId = params.get("fridgeId");
  const recipeId = params.get("id");

  if (!fridgeId || !recipeId) {
    console.error("Missing fridgeId or id in URL:", { fridgeId, recipeId });
    const titleEl = document.getElementById("recipe-title");
    if (titleEl) {
      titleEl.textContent = "Recipe not found.";
    }
    return;
  }

  try {
    const recipeRef = doc(db, "fridge", fridgeId, "recipes", recipeId);
    const snap = await getDoc(recipeRef);

    if (!snap.exists()) {
      console.error("Recipe document does not exist:", fridgeId, recipeId);
      const titleEl = document.getElementById("recipe-title");
      if (titleEl) {
        titleEl.textContent = "Recipe not found.";
      }
      return;
    }

    const data = snap.data();
    renderRecipe(data);
  } catch (err) {
    console.error("Error loading recipe:", err);
    const titleEl = document.getElementById("recipe-title");
    if (titleEl) {
      titleEl.textContent = "Error loading recipe.";
    }
  }
}

/**
 * Ensure user is logged in, then load the recipe.
 */
function initEachRecipePage() {
  onAuthReady(async (user) => {
    if (!user) {
      location.href = "index.html";
      return;
    }

    await loadRecipeFromUrl();
  });
}

document.addEventListener("DOMContentLoaded", initEachRecipePage);
