import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import { collection, addDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.addEventListener('click', createFridge);
});



async function createFridge() {
    console.log("Inside create fridge");

    //  Collect form data
    const fridgeTitle = document.getElementById("title").value;
    const fridgeDesc = document.getElementById("desc").value;
    
    // Log collected data for verification
    console.log("fridge title: ", fridgeTitle);
    console.log("fridge description: ", fridgeDesc);
    console.log("Collected review data:");
    console.log(fridgeTitle, fridgeDesc);

    // simple validation
    if (!fridgeTitle || !fridgeDesc) {
        alert("Please complete all required fields.");
        return;
    }

    const user = auth.currentUser;

    if (user) {
        try {
            const userID = user.uid;

            const docRef = await addDoc(collection(db, "fridge"), {
                userID: userID,
                title: fridgeTitle,
                description: fridgeDesc,
            });

            const userRef = doc(db, "users", user.uid);

            await updateDoc(userRef, {
                fridges: arrayUnion(docRef.id)   // add the fridge ID to the array
            });

            console.log("Fridge successfully created!");

            window.location.href = `fridgeTerminal.html`;


        } catch (error) {
            console.error("Error creating fridge:", error);
        }
    } else {
        console.log("No user is signed in");
    }
}