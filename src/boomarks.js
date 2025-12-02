// src/bookmarks.js

import { db, auth } from "./firebaseConfig.js";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const container = document.getElementById("bookmarksContainer");

function showMessage(msg) {
  if (!container) {
    console.error("No #bookmarksContainer element found in DOM");
    return;
  }
  container.innerHTML = `<p>${msg}</p>`;
}

// Load bookmarks for the logged-in user
async function loadBookmarksForUser(userId) {
  console.log("Loading bookmarks for user:", userId);

  if (!container) {
    console.error("No #bookmarksContainer found");
    return;
  }

  showMessage("Loading bookmarks...");

  try {
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      console.log("User document does not exist. No bookmarks yet.");
      showMessage("You have no bookmarks yet.");
      return;
    }

    const data = userSnap.data() || {};
    const bookmarks = data.bookmarks || [];
    console.log("Bookmarks array from Firestore:", bookmarks);

    if (!bookmarks.length) {
      showMessage("You have no bookmarks yet.");
      return;
    }

    // Fetch all recipe docs by ID
    const recipeSnaps = await Promise.all(
      bookmarks.map((id) => getDoc(doc(db, "recipes", id)))
    );

    const recipes = recipeSnaps
      .filter((snap) => {
        if (!snap.exists()) {
          console.warn("Bookmarked recipe doc not found for id:", snap.id);
          return false;
        }
        return true;
      })
      .map((snap) => ({
        id: snap.id,
        ...snap.data(),
      }));

    console.log("Resolved bookmarked recipes:", recipes);

    if (!recipes.length) {
      showMessage("No recipes found for your bookmarks.");
      return;
    }

    // Render recipe cards
    container.innerHTML = recipes
      .map(
        (r) => `
        <article class="recipe-card">
          <img src="${r.thumbnail || ""}" alt="${r.name || ""}">
          <h2>${r.name || ""}</h2>
          <p>${r.tags || ""}</p>
          <button class="viewRecipeBtn" data-id="${r.id}">
            View recipe
          </button>
        </article>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error loading bookmarks:", err);
    showMessage("Error loading bookmarks. Check console for details.");
  }
}

// When user clicks "View recipe", go to eachrecipe.html
if (container) {
  container.addEventListener("click", (event) => {
    const btn = event.target.closest(".viewRecipeBtn");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    // Use docID param for our details page
    window.location.href = `/eachrecipe.html?docID=${encodeURIComponent(id)}`;
  });
} else {
  console.error("No bookmarksContainer on the page");
}

// Wait for auth, then load bookmarks
onAuthStateChanged(auth, (user) => {
  console.log("Auth state on bookmarks page:", user);

  if (!user) {
    showMessage("Please log in to see your bookmarks.");
    return;
  }

  loadBookmarksForUser(user.uid);
});
