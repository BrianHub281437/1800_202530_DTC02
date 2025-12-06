// src/bookmarks.js

import { db, auth } from "./firebaseConfig.js";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Parse bookmark key like "fridge:FRIDGEID:RECIPEID" or "recipe:RECIPEID"
function parseBookmarkKey(key) {
  if (!key || typeof key !== "string") return null;
  const parts = key.split(":");
  if (parts.length < 2) return null;

  if (parts[0] === "fridge" && parts.length === 3) {
    return {
      type: "fridge",
      fridgeId: parts[1],
      recipeId: parts[2],
    };
  }

  if (parts[0] === "recipe" && parts.length === 2) {
    return {
      type: "recipe",
      recipeId: parts[1],
    };
  }

  return null;
}

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
  const parts = [];
  if (recipe.category) parts.push(recipe.category);
  if (recipe.area) parts.push(recipe.area);
  meta.textContent = parts.join(" • ");
  body.appendChild(meta);

  const btn = document.createElement("a");
  btn.className = "btn btn-primary btn-sm";
  btn.textContent = "View recipe";

  if (recipe.fridgeId) {
    btn.href = `/eachrecipe.html?fridgeId=${recipe.fridgeId}&id=${recipe.id}`;
  } else {
    btn.href = `/eachrecipe.html?id=${recipe.id}`;
  }

  body.appendChild(btn);
  card.appendChild(body);

  return card;
}

async function loadBookmarksForUser(userId) {
  const statusEl = document.getElementById("bookmarks-status");
  const container = document.getElementById("bookmarksContainer");
  if (!container) return;

  container.innerHTML = "";
  if (statusEl) statusEl.textContent = "Loading bookmarks...";

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      if (statusEl) statusEl.textContent = "You have no bookmarks yet.";
      return;
    }

    const data = snap.data();
    const bookmarkKeys = data.bookmarks || [];

    if (!bookmarkKeys.length) {
      if (statusEl) statusEl.textContent = "You have no bookmarks yet.";
      return;
    }

    // Fetch all recipes in parallel
    const recipePromises = bookmarkKeys
      .map(parseBookmarkKey)
      .filter(Boolean)
      .map(async (info) => {
        try {
          let ref;
          if (info.type === "fridge") {
            ref = doc(db, "fridge", info.fridgeId, "recipes", info.recipeId);
          } else {
            ref = doc(db, "recipes", info.recipeId);
          }

          const rsnap = await getDoc(ref);
          if (!rsnap.exists()) return null;

          const rdata = rsnap.data();
          return {
            id: rsnap.id,
            fridgeId: info.type === "fridge" ? info.fridgeId : null,
            name: rdata.name || rdata.strMeal || "Untitled recipe",
            category: rdata.category || rdata.strCategory || "",
            area: rdata.area || rdata.strArea || "",
            thumbnail: rdata.thumbnail || rdata.strMealThumb || "",
          };
        } catch (err) {
          console.error("Error loading bookmarked recipe:", err);
          return null;
        }
      });

    const recipes = (await Promise.all(recipePromises)).filter(Boolean);

    if (statusEl) statusEl.textContent = "";

    if (!recipes.length) {
      if (statusEl) {
        statusEl.textContent =
          "No bookmarks could be loaded. They may have been deleted.";
      }
      return;
    }

    recipes.forEach((r) => {
      const card = createRecipeCard(r);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading bookmarks:", err);
    if (statusEl) {
      statusEl.textContent =
        "Error loading bookmarks. Please try again later.";
    }
  }
}

// AUTH + INIT
onAuthStateChanged(auth, (user) => {
  const statusEl = document.getElementById("bookmarks-status");

  if (!user) {
    if (statusEl) {
      statusEl.textContent = "Please log in to see your bookmarks.";
    }
    return;
  }

  if (statusEl) statusEl.textContent = "";
  loadBookmarksForUser(user.uid);
});