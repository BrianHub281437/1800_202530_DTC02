// src/recipe.js
// -------------------------------------------------------------
// Fetch random recipes from TheMealDB and save them into Firestore
// under a specific fridge:
//   fridge/{fridgeId}/recipes/{recipeDoc}
// Includes full ingredient + measure lists for each recipe.
// -------------------------------------------------------------

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig.js";

// Optional helper (not strictly needed now)
async function getRecipes() {
  const response = await fetch(
    "https://www.themealdb.com/api/json/v1/1/search.php?s=chicken"
  );
  const data = await response.json();

  if (!data.meals) {
    console.log("No recipes found!");
    return;
  }

  console.log("Fetched recipes:", data.meals.length);
  data.meals.slice(0, 5).forEach((meal) => console.log(meal.strMeal));

  return data.meals;
}

// -------------------------------------------------------------
// Helper: extract ingredients + measures from a TheMealDB recipe
// -------------------------------------------------------------
function extractIngredients(recipe) {
  const ingredients = [];

  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];

    if (ing && ing.trim()) {
      ingredients.push({
        name: ing.trim(),                    // normalized field name
        measure: measure?.trim() || "",
      });
    }
  }

  return ingredients;
}

// -------------------------------------------------------------
// Fetch N random recipes from TheMealDB in parallel
// -------------------------------------------------------------
async function getRandomRecipes(count = 20) {
  const fetches = Array.from({ length: count }, () =>
    fetch("https://www.themealdb.com/api/json/v1/1/random.php").then((res) =>
      res.json()
    )
  );

  const results = await Promise.all(fetches);

  const recipes = results
    .map((r) => r.meals?.[0]) // first (and only) meal
    .filter(Boolean); // remove null/undefined

  console.log(`🎲 Fetched ${recipes.length} random recipes`);
  return recipes;
}

// -------------------------------------------------------------
// Save an array of recipes into a specific fridge's subcollection:
//   fridge/{fridgeId}/recipes
// -------------------------------------------------------------
async function saveRecipesToFirestoreForFridge(fridgeId, recipes) {
  if (!fridgeId) {
    console.error("❌ No fridgeId provided to saveRecipesToFirestoreForFridge");
    return;
  }

  if (!recipes || recipes.length === 0) {
    console.log("No recipes to save.");
    return;
  }

  const recipesColRef = collection(db, "fridge", fridgeId, "recipes");

  const writePromises = recipes.map((recipe) =>
    addDoc(recipesColRef, {
      idMeal: recipe.idMeal,
      name: recipe.strMeal,
      category: recipe.strCategory ?? null,
      area: recipe.strArea ?? null,
      instructions: recipe.strInstructions ?? "",
      thumbnail: recipe.strMealThumb ?? null,
      tags: recipe.strTags
        ? recipe.strTags.split(",").map((t) => t.trim())
        : [],
      youtube: recipe.strYoutube ?? null,
      ingredients: extractIngredients(recipe),
      source: "themealdb",
      createdAt: serverTimestamp(),
    })
  );

  await Promise.all(writePromises);
  console.log(
    `✅ Saved ${recipes.length} recipes to fridge ${fridgeId} (with ingredients)`
  );
}

// -------------------------------------------------------------
// Exported runner: fetch random recipes and store them for a fridge
// -------------------------------------------------------------
export async function fetchAndStoreRandomRecipesForFridge(
  fridgeId,
  count = 10
) {
  const recipes = await getRandomRecipes(count);
  await saveRecipesToFirestoreForFridge(fridgeId, recipes);
}

// ❌ No auto-run at the bottom anymore
// You must call fetchAndStoreRandomRecipesForFridge(fridgeId) from fridge.js
