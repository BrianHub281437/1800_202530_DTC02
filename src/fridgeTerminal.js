import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import {
    onAuthReady
} from "./authentication.js"

// imports for Firestore Database essentials
import { db, auth } from "./firebaseConfig.js";
import { doc, onSnapshot, getDoc, query, where } from "firebase/firestore";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";



function waitForAuth() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}
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
    const fridgesCollectionRef = collection(db, "fridge");
    //console.log("hambuga: " + fridgesCollectionRef);
    try {
        //const querySnapshot = await getDocs(fridgesCollectionRef);



        //if (user) {
        //    console.log("user:", user);
        //    const fridgeArray = user.fridges || [];

        //    console.log("Fridges:", fridgeArray);
        //}

        //const user = auth.currentUser;
        const user = await waitForAuth();
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        //if (snap.exists()) {
        //    const data = snap.data();
        //    const fridgeArray = data.fridges || [];

        //    console.log("Fridges:", fridgeArray);
        //}

        const fridgeIDs = snap.data().fridges || [];

        if (fridgeIDs.length === 0) {
            console.log("No fridges to display");
            return;
        }

        const fridgesQuery = query(
            collection(db, "fridge"),
            where("__name__", "in", fridgeIDs)
        );
        const querySnapshot = await getDocs(fridgesQuery);

        querySnapshot.forEach(doc => {


            // Clone the template
            //console.log("hambuga: " + fridgesCollectionRef);
            let newcard = cardTemplate.content.cloneNode(true);
            const fridge = doc.data(); // Get recipe data once

            // Populate the card with recipe data
            newcard.querySelector('.card-title').textContent = fridge.title;
            newcard.querySelector('.card-desc').textContent = fridge.description;
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
