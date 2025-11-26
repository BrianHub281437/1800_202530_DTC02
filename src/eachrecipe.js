import { onAuthReady } from "./authentication.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Firestore instance
const db = getFirestore();

// Grab the recipe ID from the URL: eachRecipe.html?id=abcdef123
const urlParams = new URLSearchParams(window.location.search);
const recipeId = urlParams.get("id");
 
// DOM elements
const titleEl = document.getElementById("recipe-title");
const imgEl = document.getElementById("recipe-image");
const metaEl = document.getElementById("recipe-meta");
const ingredientsList = document.getElementById("ingredients-list");
const instructionsEl = document.getElementById("instructions");
const youtubeContainer = document.getElementById("youtube-container");

/**
 * Load a single recipe from Firestore
 */
async function loadRecipe() {
  if (!recipeId) {
    titleEl.textContent = "Recipe not found.";
    return;
  }

  try {
    const recipeRef = doc(db, "recipes", recipeId);
    const snap = await getDoc(recipeRef);

    if (!snap.exists()) {
      titleEl.textContent = "Recipe not found.";
      return;
    }

    const data = snap.data();

    // TITLE
    titleEl.textContent = data.name;

    // IMAGE
    imgEl.src = data.thumbnail;
    imgEl.alt = data.name;

    // META (category + area)
    metaEl.textContent = `${data.category || ""} • ${data.area || ""}`;

    // INGREDIENTS (from stored array)
    ingredientsList.innerHTML = "";

    if (Array.isArray(data.ingredients)) {
      data.ingredients.forEach((ing) => {
        const li = document.createElement("li");
        li.textContent = `${ing.measure} ${ing.name}`;
        ingredientsList.appendChild(li);
      });
    } else {
      ingredientsList.innerHTML = "<li>No ingredient data available.</li>";
    }

    // INSTRUCTIONS
    instructionsEl.textContent = data.instructions || "No instructions provided.";

    // YOUTUBE LINK
    if (data.youtube) youtubeContainer.innerHTML = "";
if (data.youtube) {
  // Extract YouTube ID
  const url = new URL(data.youtube);
  let videoId = "";

  if (url.hostname.includes("youtube.com")) {
    videoId = url.searchParams.get("v");
  } else if (url.hostname.includes("youtu.be")) {
    videoId = url.pathname.replace("/", "");
  }

  if (videoId) {
    youtubeContainer.innerHTML = `
      <iframe 
        width="100%" 
        height="360" 
        src="https://www.youtube.com/embed/${videoId}" 
        title="YouTube recipe video"
        frameborder="0"
        allowfullscreen
        style="border-radius: 12px; margin-top: 20px;">
      </iframe>
    `;
  } else {
    youtubeContainer.innerHTML = `<p>Invalid YouTube link</p>`;
  }
}


  } catch (err) {
    console.error("Error loading recipe:", err);
    titleEl.textContent = "Error loading recipe.";
  }
}

/**
 * Protect page: require login
 */
onAuthReady(async (user) => {
  if (!user) {
    location.href = "index.html"; // redirect to login
    return;
  }

  await loadRecipe();
});
