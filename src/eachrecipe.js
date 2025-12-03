// src/eachrecipe.js

import { db, auth } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

let currentUserId = null;
let currentBookmarkKey = null;

// ---------- URL HELPERS ----------

function getParams() {
  const params = new URL(window.location.href).searchParams;

  return {
    fridgeId: params.get("fridgeId") || null,
    recipeId: params.get("id") || params.get("docID") || null,
  };
}

function buildBookmarkKey(fridgeId, recipeId) {
  if (!recipeId) return null;
  return fridgeId ? `fridge:${fridgeId}:${recipeId}` : `recipe:${recipeId}`;
}

// Convert different YouTube URL formats to an embed URL
function toYouTubeEmbedUrl(url) {
  if (!url) return "";

  // If it's already an embed URL
  if (url.includes("embed")) return url;

  try {
    const u = new URL(url);
    const idFromQuery = u.searchParams.get("v");
    if (idFromQuery) {
      return `https://www.youtube.com/embed/${idFromQuery}`;
    }
  } catch (e) {
    console.warn("Could not parse YouTube URL:", url);
  }

  // Last fallback: treat whole string as ID
  return `https://www.youtube.com/embed/${url}`;
}

// ---------- LOAD & DISPLAY RECIPE ----------

async function loadRecipe() {
  const { fridgeId, recipeId } = getParams();

  if (!recipeId) {
    console.error("No recipe id in URL");
    const titleEl = document.getElementById("recipe-title");
    if (titleEl) titleEl.textContent = "Recipe not found (no ID).";
    return;
  }

  // Where to load from
  let recipeRef;
  if (fridgeId) {
    recipeRef = doc(db, "fridge", fridgeId, "recipes", recipeId);
  } else {
    // fallback global collection
    recipeRef = doc(db, "recipes", recipeId);
  }

  try {
    const snap = await getDoc(recipeRef);

    if (!snap.exists()) {
      const titleEl = document.getElementById("recipe-title");
      if (titleEl) titleEl.textContent = "Recipe not found in database.";
      return;
    }

    const data = snap.data();

    const name = data.name || data.strMeal || "Untitled recipe";
    const category = data.category || data.strCategory || "";
    const area = data.area || data.strArea || "";
    const instructions = data.instructions || data.strInstructions || "";
    const ingredientsArray = data.ingredients || data.extendedIngredients || [];
    const thumbnail = data.thumbnail || data.strMealThumb || "";
    const youtube = data.youtube || data.strYoutube || "";

    // Bookmark key for this recipe
    currentBookmarkKey = buildBookmarkKey(fridgeId, recipeId);

    // ---- Update DOM ----
    const titleEl = document.getElementById("recipe-title");
    const metaEl = document.getElementById("recipe-meta");
    const imgEl = document.getElementById("recipe-image");
    const ingList = document.getElementById("ingredients-list");
    const instrEl = document.getElementById("instructions");
    const youtubeContainer = document.getElementById("youtube-container");

    if (titleEl) titleEl.textContent = name;

    if (metaEl) {
      const parts = [];
      if (category) parts.push(category);
      if (area) parts.push(area);
      metaEl.textContent = parts.join(" • ");
    }

    if (imgEl) {
      imgEl.src = thumbnail || "";
      imgEl.alt = `${name} image`;
    }

    // ----- INGREDIENTS -----
    if (ingList) {
      ingList.innerHTML = "";
      if (Array.isArray(ingredientsArray) && ingredientsArray.length) {
        ingredientsArray.forEach((obj) => {
          const li = document.createElement("li");
          if (obj.ingredient || obj.name) {
            li.textContent = `${obj.ingredient || obj.name} – ${
              obj.measure || obj.amount || ""
            }`;
          } else {
            li.textContent = String(obj);
          }
          ingList.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "No ingredients listed for this recipe.";
        ingList.appendChild(li);
      }
    }

    // ----- INSTRUCTIONS with STEP FORMAT -----
    if (instrEl) {
      instrEl.innerHTML = "";

      if (!instructions.trim()) {
        instrEl.textContent = "No instructions provided for this recipe.";
      } else {
        // Try splitting by line breaks first
        let rawSteps = instructions
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        // If everything was one big line, split by sentences
        if (rawSteps.length === 1) {
          rawSteps = instructions
            .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }

        if (!rawSteps.length) {
          instrEl.textContent = instructions;
        } else {
          rawSteps.forEach((stepText, idx) => {
            const p = document.createElement("p");

            const strong = document.createElement("strong");
            strong.textContent = `Step ${idx + 1}: `;
            p.appendChild(strong);

            // Remove leading "Step X:" if it already exists in text
            const cleaned = stepText.replace(/^Step\s+\d+:\s*/i, "");

            p.appendChild(document.createTextNode(cleaned));
            instrEl.appendChild(p);
          });
        }
      }
    }

    // ----- YOUTUBE -----
    if (youtubeContainer) {
      if (youtube) {
        const embedUrl = toYouTubeEmbedUrl(youtube);
        youtubeContainer.innerHTML = `
          <iframe
            width="100%"
            height="400"
            src="${embedUrl}"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        `;
      } else {
        youtubeContainer.innerHTML = "";
      }
    }

    // After recipe is loaded, update bookmark button (if user known)
    await updateBookmarkButtonState();
  } catch (err) {
    console.error("Error loading recipe:", err);
    const titleEl = document.getElementById("recipe-title");
    if (titleEl) titleEl.textContent = "Error loading recipe.";
  }
}

// ---------- AUTH & BOOKMARK BUTTON ----------

async function updateBookmarkButtonState() {
  const btn = document.getElementById("bookmarkBtn");
  if (!btn) return;

  // default
  btn.disabled = false;
  btn.textContent = "Add to bookmarks";

  if (!currentUserId) {
    btn.textContent = "Log in to bookmark";
    btn.disabled = true;
    return;
  }

  if (!currentBookmarkKey) {
    return;
  }

  try {
    const userRef = doc(db, "users", currentUserId);
    const snap = await getDoc(userRef);

    const data = snap.exists() ? snap.data() : {};
    const bookmarks = data.bookmarks || [];
    const isBookmarked = bookmarks.includes(currentBookmarkKey);

    btn.dataset.bookmarked = isBookmarked ? "true" : "false";
    btn.textContent = isBookmarked ? "Remove bookmark" : "Add to bookmarks";
  } catch (err) {
    console.error("Error reading bookmarks:", err);
  }
}

async function toggleBookmark() {
  const btn = document.getElementById("bookmarkBtn");
  if (!btn) return;

  if (!currentUserId) {
    alert("Please log in to bookmark recipes.");
    return;
  }

  if (!currentBookmarkKey) {
    console.warn("No bookmark key for this recipe.");
    return;
  }

  try {
    const userRef = doc(db, "users", currentUserId);
    const snap = await getDoc(userRef);

    const data = snap.exists() ? snap.data() : {};
    const bookmarks = data.bookmarks || [];
    const already = bookmarks.includes(currentBookmarkKey);

    if (!snap.exists()) {
      await setDoc(userRef, { bookmarks: [] }, { merge: true });
    }

    await updateDoc(userRef, {
      bookmarks: already
        ? arrayRemove(currentBookmarkKey)
        : arrayUnion(currentBookmarkKey),
    });

    await updateBookmarkButtonState();
  } catch (err) {
    console.error("Error updating bookmarks:", err);
    btn.textContent = "Error – try again";
  }
}

// ---------- AUTH & INIT ----------

onAuthStateChanged(auth, (user) => {
  currentUserId = user ? user.uid : null;
  updateBookmarkButtonState();
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("bookmarkBtn");
  if (btn) {
    btn.addEventListener("click", toggleBookmark);
  }

  loadRecipe();
});