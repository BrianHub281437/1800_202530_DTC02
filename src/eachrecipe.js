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

let currentUserId = null;      // logged-in user's uid
let currentRecipeId = null;    // recipe docID from URL

// Get the document ID (?docID=...) from the URL
function getDocIdFromUrl() {
  const params = new URL(window.location.href).searchParams;

  // Support both ?docID=... and ?id=...
  const fromDocID = params.get("docID");
  const fromId = params.get("id");

  return fromDocID || fromId;
}

// -----------------------------------
// LOAD & DISPLAY RECIPE FROM FIRESTORE
// -----------------------------------
async function displayRecipeInfo() {
  const id = getDocIdFromUrl();
  currentRecipeId = id;

  if (!id) {
    console.error("No docID in URL");
    document.getElementById("recipe-title").textContent =
      "Recipe not found (no ID).";
    return;
  }

  try {
    const recipeRef = doc(db, "recipes", id);
    const recipeSnap = await getDoc(recipeRef);

    if (!recipeSnap.exists()) {
      document.getElementById("recipe-title").textContent =
        "Recipe not found in database.";
      return;
    }

    const recipe = recipeSnap.data();

    const name = recipe.name || "";
    const tags = recipe.tags || "";
    const instructions = recipe.instructions || "";
    const ingredientsArray = recipe.ingredients || [];
    const thumbnail = recipe.thumbnail || "";

    // Title
    document.getElementById("recipe-title").textContent = name;

    // Meta (tags etc.)
    document.getElementById("recipe-meta").textContent = tags;

    // Image
    const img = document.getElementById("recipe-image");
    if (img) {
      img.src = thumbnail;
      img.alt = `${name} image`;
    }

    // Ingredients list (ul)
    const ingredientsList = document.getElementById("ingredients-list");
    ingredientsList.innerHTML = "";
    ingredientsArray.forEach((obj) => {
      const li = document.createElement("li");
      li.textContent = `${obj.ingredient} – ${obj.measure}`;
      ingredientsList.appendChild(li);
    });

    // Instructions
    document.getElementById("instructions").textContent = instructions;

    // After loading recipe, set bookmark button state
    await updateBookmarkButtonState();
  } catch (error) {
    console.error("Error loading recipe:", error);
    document.getElementById("recipe-title").textContent =
      "Error loading recipe.";
  }
}

// -----------------------------------
// AUTH – keep user id
// -----------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    console.log("LOGGED IN:", currentUserId);
  } else {
    currentUserId = null;
    console.log("NOT LOGGED IN");
  }

  // whenever auth changes, refresh button
  updateBookmarkButtonState();
});

// -----------------------------------
// BOOKMARK BUTTON STATE
// -----------------------------------
async function updateBookmarkButtonState() {
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  if (!bookmarkBtn) return;

  // default text
  bookmarkBtn.textContent = "Add to bookmarks";

  // need user + recipe to know real state
  if (!currentUserId || !currentRecipeId) return;

  try {
    const userDocRef = doc(db, "users", currentUserId);
    const userSnap = await getDoc(userDocRef);

    const data = userSnap.exists() ? userSnap.data() : {};
    const bookmarks = data.bookmarks || [];
    const isBookmarked = bookmarks.includes(currentRecipeId);

    bookmarkBtn.dataset.bookmarked = isBookmarked ? "true" : "false";
    bookmarkBtn.textContent = isBookmarked
      ? "Remove bookmark"
      : "Add to bookmarks";
  } catch (err) {
    console.error("Error checking bookmarks:", err);
  }
}

// -----------------------------------
// TOGGLE BOOKMARK
// -----------------------------------
async function toggleBookmark() {
  const bookmarkBtn = document.getElementById("bookmarkBtn");

  if (!currentRecipeId) {
    console.warn("No recipe ID in URL.");
    return;
  }

  if (!currentUserId) {
    alert("Please log in to bookmark recipes.");
    return;
  }

  try {
    const userDocRef = doc(db, "users", currentUserId);
    let userSnap = await getDoc(userDocRef);

    // If user doc doesn't exist, create it
    if (!userSnap.exists()) {
      await setDoc(
        userDocRef,
        {
          bookmarks: [],
        },
        { merge: true }
      );
      userSnap = await getDoc(userDocRef);
    }

    const data = userSnap.data() || {};
    const bookmarks = data.bookmarks || [];
    const alreadyBookmarked = bookmarks.includes(currentRecipeId);

    await updateDoc(userDocRef, {
      bookmarks: alreadyBookmarked
        ? arrayRemove(currentRecipeId)
        : arrayUnion(currentRecipeId),
    });

    console.log(
      alreadyBookmarked ? "Removed bookmark" : "Added bookmark",
      currentRecipeId
    );

    await updateBookmarkButtonState();
  } catch (err) {
    console.error("Error updating bookmarks:", err);
    if (bookmarkBtn) bookmarkBtn.textContent = "Error – try again";
  }
}

// -----------------------------------
// INITIAL SETUP
// -----------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener("click", toggleBookmark);
  }

  displayRecipeInfo();
});
