import { db, auth } from "./firebaseConfig.js";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

// Get the document ID from the URL
function getDocIdFromUrl() {
    const params = new URL(window.location.href).searchParams;
    return params.get("docID");
}

    
// Fetch the hike and display its name and image
async function displayRecipeInfo() {
    const id = getDocIdFromUrl();

    

    try {
        const recipeRef = doc(db, "recipes", id);
        const recipeSnap = await getDoc(recipeRef);

        const recipe = recipeSnap.data();
        const name = recipe.name;
        const tags = recipe.tags;
        const code = recipe.code;
        const instructions = recipe.instructions;
        const ingredientsArray = recipe.ingredients;
        const thumbnail = recipe.thumbnail;
        
        // Update the page
        document.getElementById("recipeName").textContent = name;
        document.getElementById("recipeTags").textContent = tags;
        document.getElementById("recipeImage").textContent = thumbnail;

        const item = document.createElement("div");
        item.innerHTML += 'Ingredients: <br>'
        ingredientsArray.forEach((obj) => {
            
            //item.classList.add("object-item");
            item.innerHTML += `
              ${obj.ingredient} 
              Measure: ${obj.measure} <br>
            `;
            console.log(item.innerHTML);
        });

        document.getElementById("recipeIngredients").innerHTML = item.innerHTML;
        document.getElementById("recipeInstructions").textContent = instructions;
        //const img = document.getElementById("recipeImage");
        //img.src = `./images/${code}.png`;
        //img.alt = `${name} image`;
    } catch (error) {
        console.error("Error loading recipe:", error);
        document.getElementById("recipeName").textContent = "Error loading recipe.";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    bookmarkBtn.addEventListener('click', saveRecipeDocumentIDToBookmarks);
});

//const auth = getAuth();
//const user = auth.currentUser;   
//const userID = user.uid;
//console.log(auth);
//console.log(user);
//console.log(userID);
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("LOGGED IN" + user.uid);
        const youID = user.uid;

    } else {
        console.log("NOT LOGGED IN");
    }
});
        

//async function getUserDocument(user) {
//    const userDocRef = doc(db, "users", user); // Reference to the user's document
//    const userDocSnap = await getDoc(userDocRef); // Get the document snapshot

//    if (userDocSnap.exists()) {
//        console.log("User data:", userDocSnap.data());
//        return userDocSnap.data();
//    } else {
//        console.log("No such user document!");
//        return null;
//    }
//}
//getUserDocument(user);
function saveRecipeDocumentIDToBookmarks() {
    const params = new URL(window.location.href);
    const recipeID = params.searchParams.get("docID");

    if (!recipeID) {
        console.warn("No recipe ID found in URL. Cannot continue.");
        return;
    } else {
        console.warn("I AM COMING FOR YOU");
        console.log(recipeID);
    }

    // add recipe to bookmarks
    const auth = getAuth();

    const docRef = doc(db, "users", youID);

    updateDoc(docRef, {
        bookmarks: arrayUnion(recipeID)
    });
    
}
displayRecipeInfo();