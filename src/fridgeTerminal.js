import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { onAuthReady } from "./authentication.js";

// imports for Firestore Database essentials
import { db, auth } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  query,
  where,
  updateDoc,
  arrayUnion,
  collection,
  getDocs,
  arrayRemove,
  setDoc,          
} from "firebase/firestore";
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

  try {
    const user = await waitForAuth();
    if (!user) {
      console.warn("No authenticated user in displayCardsDynamically");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // If user doc doesn't exist yet, create a basic one
    if (!snap.exists()) {
      console.warn("User doc does not exist yet. Creating an empty one.");
      await setDoc(userRef, { fridges: [] }, { merge: true });
      // Nothing to display yet
      console.log("No fridges to display");
      return;
    }

    const data = snap.data() || {};
    const fridgeIDs = data.fridges || [];

    if (!fridgeIDs.length) {
      console.log("No fridges to display");
      return;
    }

    const fridgesQuery = query(
      collection(db, "fridge"),
      where("__name__", "in", fridgeIDs)
    );
    const querySnapshot = await getDocs(fridgesQuery);

    querySnapshot.forEach((docSnap) => {
      const fridgeId = docSnap.id;
      const fridgeIdTrm = fridgeId.trim();

      // Clone the template
      let newcard = cardTemplate.content.cloneNode(true);
      const fridge = docSnap.data(); // Get fridge data once

      // Populate the card with fridge data
      newcard.querySelector(".card-title").textContent = fridge.title;
      newcard.querySelector(".card-desc").textContent = fridge.description;
      newcard.querySelector(
        ".card-fridgeId"
      ).textContent = `fridge join code: ${fridgeId}`;
      newcard.querySelector(
        ".enter-fridge"
      ).href = `fridge.html?docID=${fridgeId}`;

      // Remove fridge button
      const removeBtn = newcard.querySelector(".remove-fridge");
      removeBtn.addEventListener("click", async () => {
        const confirmRemove = confirm(`Remove fridge ${fridgeIdTrm}?`);
        if (!confirmRemove) return;

        try {
          await updateDoc(userRef, {
            fridges: arrayRemove(fridgeIdTrm),
          });

          // Remove from UI AFTER Firestore succeeds
          removeBtn.closest(".col").remove();
          alert("Fridge removed!");
        } catch (err) {
          console.error("ERROR REMOVING FRIDGE:", err);
          alert("Error removing fridge.");
        }
      });

      // Attach the new card to the container
      document.getElementById("fridges-go-here").appendChild(newcard);
    });
  } catch (error) {
    console.error("Error getting documents: ", error);
  }
}

document
  .getElementById("fridge-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const fridgeID = document.getElementById("fridge-id").value.trim();
    if (!fridgeID) return alert("Please enter a fridge ID.");

    try {
      // 1. Check if that fridge exists
      const fridgeRef = doc(db, "fridge", fridgeID);
      const fridgeSnap = await getDoc(fridgeRef);

      if (!fridgeSnap.exists()) {
        alert("Fridge not found. Check the ID.");
        return;
      }

      // 2. Ensure user doc exists
      const user = await waitForAuth();
      if (!user) {
        alert("You must be logged in to join a fridge.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, { fridges: [] }, { merge: true });
      }

      // 3. Add the fridge ID to the user's array
      await updateDoc(userRef, {
        fridges: arrayUnion(fridgeID),
      });

      console.log("Fridge added to user!");
      alert("Successfully joined fridge!");

      document.getElementById("fridge-form").reset();
      window.location.reload();
    } catch (err) {
      console.error("Error adding fridge:", err);
      alert("Could not join fridge.");
    }
  });

// Call the function to display cards when the page loads
displayCardsDynamically();