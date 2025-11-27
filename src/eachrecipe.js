import { onAuthReady } from "./authentication.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = getFirestore();

// Get ?id= from URL
const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");

// DOM elements
const titleEl = document.getElementById("recipe-title");
const imgEl = document.getElementById("recipe-image");
const metaEl = document.getElementById("recipe-meta");
const ingredientsList = document.getElementById("ingredients-list");
const instructionsEl = document.getElementById("instructions");
const youtubeContainer = document.getElementById("youtube-container");

/** Render array of { name, measure } */
function renderIngredientsArray(ingredients) {
  ingredientsList.innerHTML = "";

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    ingredientsList.innerHTML = "<li>No ingredient data available.</li>";
    return;
  }

  ingredients.forEach((ing) => {
    const name =
      ing.name ||
      ing.ingredient ||
      ing.strIngredient ||
      "";
    const measure =
      ing.measure ||
      ing.amount ||
      ing.strMeasure ||
      "";

    const parts = [measure, name].filter(Boolean);
    const li = document.createElement("li");
    li.textContent = parts.join(" ");
    ingredientsList.appendChild(li);
  });
}

/** Get full details from TheMealDB using idMeal */
async function fetchMealDbDetails(idMeal) {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(
        idMeal
      )}`
    );
    const data = await res.json();
    if (!data.meals || !data.meals[0]) {
      return null;
    }

    const meal = data.meals[0];

    // Build proper ingredients array: { name, measure }
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const meas = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        ingredients.push({
          name: ing.trim(),              // <-- ingredient name
          measure: (meas || "").trim(),  // <-- "5 tablespoons", "1 chopped", etc.
        });
      }
    }

    return {
      instructions: meal.strInstructions || "",
      ingredients,
    };
  } catch (err) {
    console.error("Error fetching from TheMealDB:", err);
    return null;
  }
}

async function loadRecipe() {
  if (!recipeId) {
    console.error("No recipe id in URL.");
    titleEl.textContent = "Recipe not found.";
    return;
  }

  console.log(" Loading recipe with id:", recipeId);

  try {
    const recipeRef = doc(db, "recipes", recipeId);
    const snap = await getDoc(recipeRef);

    if (!snap.exists()) {
      console.error(" No Firestore doc for id:", recipeId);
      titleEl.textContent = "Recipe not found.";
      return;
    }

    const data = snap.data();
    console.log(" Loaded Firestore recipe:", data);

    // TITLE
    titleEl.textContent = data.name || "Untitled recipe";

    // IMAGE
    if (data.thumbnail) {
      imgEl.src = data.thumbnail;
      imgEl.alt = data.name || "Recipe image";
    } else {
      imgEl.style.display = "none";
    }

    // META
    const metaParts = [];
    if (data.category) metaParts.push(data.category);
    if (data.area) metaParts.push(data.area);
    metaEl.textContent = metaParts.join(" • ");

    // Start with instructions from Firestore if present
    let instructions = data.instructions || "";

    // Always try to enrich with MealDB if idMeal exists
    let ingredients = [];
    if (data.idMeal) {
      const extra = await fetchMealDbDetails(data.idMeal);
      if (extra) {
        if (!instructions) {
          instructions = extra.instructions;
        }
        ingredients = extra.ingredients;
      }
    }

    // Fallback if still no instructions
    instructionsEl.textContent =
      instructions || "No instructions provided.";

    // Render ingredients
    renderIngredientsArray(ingredients);

    // YOUTUBE EMBED
    youtubeContainer.innerHTML = "";
    if (data.youtube) {
      try {
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
        }
      } catch (e) {
        console.error("Invalid YouTube URL:", data.youtube);
      }
    }
  } catch (err) {
    console.error("🔥 Error loading recipe:", err);
    titleEl.textContent = "Error loading recipe.";
  }
}

onAuthReady(async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  await loadRecipe();
});
