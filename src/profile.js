<<<<<<< HEAD
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig.js";

// -------------------------------------------------------------
// Function to populate user info in the profile form
// Fetches user data from Firestore and fills in the form fields
// Assumes user is already authenticated
// and their UID corresponds to a document in the "users" collection
// of Firestore.
// Fields populated: name, school, city
// Form field IDs: nameInput, schoolInput, cityInput
// -------------------------------------------------------------
function populateUserInfo() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // reference to the user document
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
    
					const { name = "", school = "", city = "" } = userData;

					const userName = document.getElementById('nameInput').value;       //get the value of the field with id="nameInput"
const userSchool = document.getElementById('schoolInput').value;     //get the value of the field with id="schoolInput"
const userCity = document.getElementById('cityInput').value;       //get the value of the field with id="cityInput"
  await updateUserDocument(user.uid, userName, userSchool, userCity); 
  document.getElementById('personalInfoFields').disabled = true;
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error getting user document:", error);
      }
    } else {
      console.log("No user is signed in");
    }
  });
}
//-------------------------------------------------------------
// Function to enable editing of user info form fields
//------------------------------------------------------------- 
document.querySelector('#editButton').addEventListener('click', editUserInfo);
function editUserInfo() {
    //Enable the form fields
    document.getElementById('personalInfoFields').disabled = false;
}
//-------------------------------------------------------------
// Function to save updated user info from the profile form
//-------------------------------------------------------------
document.querySelector('#saveButton').addEventListener('click', saveUserInfo);   //Add event listener for save button
async function saveUserInfo() {
		  const user = auth.currentUser;   // ✅ get the currently logged-in user
	    if (!user) {
		    alert("No user is signed in. Please log in first.");
		    return;
		  }
     //enter code here

     //a) get user entered values

     //b) update user's document in Firestore

     //c) disable edit 
}
//-------------------------------------------------------------
// Updates the user document in Firestore with new values
// Parameters:
//   uid (string)  – user’s UID
//   name, school, city (strings)
//-------------------------------------------------------------
async function updateUserDocument(uid, name, school, city) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { name, school, city });
    console.log("User document successfully updated!");
  } catch (error) {
    console.error("Error updating user document:", error);
  }
}

//call the function to run it 
populateUserInfo();
=======

// /src/profile.js — updated for new layout (photo at top) and better edit flow
// Firebase (v9+/v10) Storage + Firestore version
// Assumes /src/app.js exports initialized { auth, db, storage }

import { auth, db, storage } from '/src/app.js';
import { onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js';

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

// Form controls
const formFs = $('personalInfoFields');
const editBtn = $('editButton');
const saveBtn = $('saveButton');

// Inputs
const nameInput = $('nameInput');
const schoolInput = $('schoolInput');
const cityInput = $('cityInput');
const phoneInput = $('phoneInput');
const bioInput = $('bioInput');

// Photo controls (now at top of page)
const photoInput = $('photoInput');
const photoPreview = $('photoPreview');
const removePhotoBtn = $('removePhotoBtn');

// ---------- State ----------
let currentUser = null;
let currentPhotoPath = '';

// ---------- UI helpers ----------
function setPreview(url) {
  if (url) {
    photoPreview.src = url;
    photoPreview.removeAttribute('aria-hidden');
  } else {
    photoPreview.removeAttribute('src');
    photoPreview.setAttribute('aria-hidden', 'true');
  }
}

function enableEditing(enable) {
  // Text fields live inside fieldset
  if (enable) formFs.removeAttribute('disabled');
  else formFs.setAttribute('disabled', '');

  // Keep photo controls consistent with edit mode too
  photoInput.disabled = !enable;
  removePhotoBtn.disabled = !enable;
}

// Basic, non-blocking phone sanitation (optional)
function sanitizePhone(input) {
  return input.replace(/[^\d+\-\s]/g, '').slice(0, 32);
}

// ---------- Storage helpers ----------
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function uploadPhotoIfAny(uid) {
  const file = photoInput.files?.[0];
  if (!file) return { photoURL: undefined, photoPath: undefined };
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return { photoURL: undefined, photoPath: undefined };
  }
  // Use a stable predictable path per user
  const path = `users/${uid}/profile.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return { photoURL: url, photoPath: path };
}

async function removeExistingPhotoIfAny() {
  if (!currentUser || !currentPhotoPath) return;
  try {
    await deleteObject(ref(storage, currentPhotoPath));
  } catch (e) {
    console.warn('deleteObject warning:', e?.message || e);
  }
}

// ---------- Firestore helpers ----------
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return;
  const data = snap.data();
  nameInput.value   = data.name   || '';
  schoolInput.value = data.school || '';
  cityInput.value   = data.city   || '';
  phoneInput.value  = data.phone  || '';
  bioInput.value    = data.bio    || '';
  currentPhotoPath  = data.photoPath || '';
  setPreview(data.photoURL || '');
}

function readForm() {
  return {
    name: nameInput.value.trim(),
    school: schoolInput.value.trim(),
    city: cityInput.value.trim(),
    phone: sanitizePhone(phoneInput.value.trim()), // optional
    bio: bioInput.value.trim(),                    // optional
  };
}

async function ensureSignedIn() {
  if (currentUser) return currentUser;
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Give auth state change a tick
    await new Promise((r) => setTimeout(r, 50));
    return currentUser;
  } catch (e) {
    throw new Error('Sign-in required to save your profile.');
  }
}

async function saveProfile() {
  // Sign-in on demand
  let user;
  try {
    user = await ensureSignedIn();
  } catch (e) {
    alert(e.message || 'Please sign in.');
    return;
  }
  const uid = user.uid;

  // Prepare updates
  const update = readForm();
  const uploaded = await uploadPhotoIfAny(uid);
  if (uploaded.photoURL) {
    update.photoURL = uploaded.photoURL;
    update.photoPath = uploaded.photoPath;
  }

  // If preview cleared and no file selected, delete prior photo
  const previewHasSrc = !!photoPreview.getAttribute('src');
  const fileSelected = !!(photoInput.files && photoInput.files[0]);
  if (!previewHasSrc && !fileSelected && currentPhotoPath) {
    await removeExistingPhotoIfAny();
    update.photoURL = '';
    update.photoPath = '';
  }

  // Upsert user doc
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { ...update, updatedAt: serverTimestamp() }, { merge: true });

  // Mirror to Auth (best-effort)
  try {
    const authUpdate = {};
    if (update.name) authUpdate.displayName = update.name;
    if (update.photoURL !== undefined) authUpdate.photoURL = update.photoURL || null;
    if (Object.keys(authUpdate).length) await updateProfile(user, authUpdate);
  } catch (e) {
    console.warn('Auth profile update skipped:', e?.message || e);
  }

  currentPhotoPath = uploaded.photoPath || currentPhotoPath || '';
  if (uploaded.photoURL) setPreview(uploaded.photoURL);

  enableEditing(false);
  alert('Profile saved.');
}

// ---------- Event wiring ----------
function attachHandlers() {
  editBtn?.addEventListener('click', () => enableEditing(true));
  saveBtn?.addEventListener('click', saveProfile);

  photoInput?.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      photoInput.value = '';
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
  });

  removePhotoBtn?.addEventListener('click', () => {
    setPreview('');
    photoInput.value = '';
  });
}

onAuthStateChanged(auth, async (user) => {
  // Do not toggle edit state here; Edit button controls it.
  currentUser = user || null;
  if (user) await loadProfile(user.uid);
});

document.addEventListener('DOMContentLoaded', () => {
  attachHandlers();
  // Start in read-only mode
  enableEditing(false);
});
>>>>>>> f376e9db442b402f2eec4798e20935cb18cbad89
