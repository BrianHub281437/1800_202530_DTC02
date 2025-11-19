// src/profilePictureFirebase.js
// we are not using it because we dont have freee storage in firebase free plan
import { auth, db, storage } from "./firebaseConfig.js";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// DOM elements (matching profile.html IDs)
const fileInput = document.getElementById("photoInput");
const previewImg = document.getElementById("photoPreview");
const removeBtn = document.getElementById("removePhotoBtn");

// If we aren't on the profile page, do nothing
if (!fileInput || !previewImg || !removeBtn) {
  console.debug("profilePictureFirebase: no profile elements found on this page.");
} else {
  let currentUser = null;

  async function loadExistingPhoto(user) {
    const userDocRef = doc(db, "users", user.uid);

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) {
          previewImg.src = data.photoURL;
          previewImg.removeAttribute("aria-hidden");
          removeBtn.disabled = false;
        } else {
          previewImg.src = "";
          previewImg.setAttribute("aria-hidden", "true");
          removeBtn.disabled = true;
        }
      }
    } catch (err) {
      console.error("Error loading profile picture:", err);
    }
  }

  // Watch auth state
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
      console.warn("profilePictureFirebase: no user signed in.");
      fileInput.disabled = true;
      removeBtn.disabled = true;
      previewImg.src = "";
      previewImg.setAttribute("aria-hidden", "true");
      return;
    }

    console.debug("profilePictureFirebase: user signed in:", user.uid);
    fileInput.disabled = false;
    await loadExistingPhoto(user);
  });

  // When user chooses a new picture
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!currentUser) {
      alert("Please log in before uploading a profile picture.");
      fileInput.value = "";
      return;
    }

    const picRef = ref(storage, `profilePictures/${currentUser.uid}`);
    const userDocRef = doc(db, "users", currentUser.uid);

    try {
      // Upload to Storage
      await uploadBytes(picRef, file);
      console.debug("profilePictureFirebase: upload complete.");

      // Get public URL
      const downloadURL = await getDownloadURL(picRef);
      console.debug("profilePictureFirebase: download URL:", downloadURL);

      // Save URL to Firestore under users/{uid}
      await setDoc(
        userDocRef,
        { photoURL: downloadURL },
        { merge: true }
      );

      // Update UI
      previewImg.src = downloadURL;
      previewImg.removeAttribute("aria-hidden");
      removeBtn.disabled = false;
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      alert("Could not upload profile picture. Please try again.");
    }
  });

  // Remove picture
  removeBtn.addEventListener("click", async () => {
    if (!currentUser) {
      alert("Please log in first.");
      return;
    }

    const picRef = ref(storage, `profilePictures/${currentUser.uid}`);
    const userDocRef = doc(db, "users", currentUser.uid);

    try {
      await deleteObject(picRef).catch(() => {
        // ignore if missing
      });

      await setDoc(
        userDocRef,
        { photoURL: "" },
        { merge: true }
      );

      previewImg.src = "";
      previewImg.setAttribute("aria-hidden", "true");
      fileInput.value = "";
      removeBtn.disabled = true;
    } catch (err) {
      console.error("Error removing profile picture:", err);
      alert("Could not remove profile picture. Please try again.");
    }
  });
}
