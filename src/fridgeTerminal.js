import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import {
    onAuthReady
} from "./authentication.js"

// imports for Firestore Database essentials
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";


function showDashboard() {

    onAuthReady(async (user) => {
        if (!user) {
            // If no user is signed in → redirect back to login page.
            location.href = "index.html";
            return;
        }

    });
}

showDashboard();

async function displayCardsDynamically() {
    let cardTemplate = document.getElementById("fridgeCardTemplate");
    const fridgesCollectionRef = collection(db, "fridges");

    try {
        const querySnapshot = await getDocs(fridgesCollectionRef);
        querySnapshot.forEach(doc => {
            // Clone the template
            let newcard = cardTemplate.content.cloneNode(true);
            const fridge = doc.data(); // Get recipe data once

            // Populate the card with recipe data
            newcard.querySelector('.card-title').textContent = fridge.name;
            newcard.querySelector('.card-text').textContent = fridge.details;
            newcard.querySelector('.card-owner').textContent = fridge.owner;
            newcard.querySelector(".enter-fridge").href = `fridge.html?docID=${doc.id}`;


            // Attach the new card to the container
            document.getElementById("fridges-go-here").appendChild(newcard);
        });
    } catch (error) {
        console.error("Error getting documents: ", error);
    }
}

// Call the function to display cards when the page loads
displayCardsDynamically();
