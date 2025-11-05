import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import {
    onAuthReady
} from "./authentication.js"

// imports for Firestore Database essentials
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

function sayHello() {
    
}
document.addEventListener('DOMContentLoaded', sayHello);

// somewhere here goes the data for recco and recent
// Helper function to add the sample recipe documents.
function addRecipeData() {
    const recipesRef = collection(db, "recipes");
    console.log("Adding sample recipe data...");
    addDoc(recipesRef, {
        code: "000000", name: "Authentic Spicy Burrito", details: "Super secret burrtion recipe from my great grandmother", 
        author: "Vq3qIotRfMMDH74YOVRJ3B8bEFo1",
        last_updated: serverTimestamp()
    });
    addDoc(recipesRef, {
        code: "000001", name: "Fatty Tuna Salad", details: "Expertly crafted tuna salad recipe from yours truely!", 
        author: "Vq3qIotRfMMDH74YOVRJ3B8bEFo1",
        last_updated: serverTimestamp()
    });
    addDoc(recipesRef, {
        code: "000002", name: "Juicy Chicken Sandwich", details: "Amazing and super awsome sandwich I made", 
        author: "Vq3qIotRfMMDH74YOVRJ3B8bEFo1",
        last_updated: serverTimestamp()
    });
}
async function seedRecipes() {
    const recipesRef = collection(db, "recipes");
    const querySnapshot = await getDocs(recipesRef);

    // Check if the collection is empty
    if (querySnapshot.empty) {
        console.log("Recipes collection is empty. Seeding data...");
        addRecipeData();
    } else {
        console.log("Recipes collection already contains data. Skipping seed.");
    }
}

// Call the seeding function when the main.html page loads.
seedRecipes();

function showDashboard() {
    const nameElement = document.getElementById("name-goes-here"); // the <h1> element to display "Hello, {name}"

    onAuthReady(async (user) => {
        if (!user) {
            // If no user is signed in → redirect back to login page.
            location.href = "index.html";
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const name = userDoc.exists()
            ? userDoc.data().name
            : user.displayName || user.email;

        // Update the welcome message with their name/email.
        if (nameElement) {
            nameElement.textContent = `${name}!`;
        }
    });
}

showDashboard();

async function displayCardsDynamically() {
    let cardTemplate = document.getElementById("recipeCardTemplate");
    const recipesCollectionRef = collection(db, "recipes");

    try {
        const querySnapshot = await getDocs(recipesCollectionRef);
        querySnapshot.forEach(doc => {
            // Clone the template
            let newcard = cardTemplate.content.cloneNode(true);
            const recipe = doc.data(); // Get recipe data once

            // Populate the card with recipe data
            newcard.querySelector('.card-title').textContent = recipe.name;
            newcard.querySelector('.card-text').textContent = recipe.details;
            newcard.querySelector('.card-author').textContent = recipe.author;

            // 👇 ADD THIS LINE TO SET THE IMAGE SOURCE
            newcard.querySelector('.card-image').src = `./images/${recipe.code}.png`;

            // Attach the new card to the container
            document.getElementById("recipes-go-here").appendChild(newcard);
        });
    } catch (error) {
        console.error("Error getting documents: ", error);
    }
}

// Call the function to display cards when the page loads
displayCardsDynamically();
