// src/profilePictureLocal.js
// Local-only version: stores profile picture in localStorage, no Firebase required.

console.log("profilePictureLocal.js loaded");

const fileInput = document.getElementById("photoInput");
const previewImg = document.getElementById("photoPreview");
const removeBtn = document.getElementById("removePhotoBtn");

if (!fileInput || !previewImg || !removeBtn) {
  console.warn("profilePictureLocal: elements not found on this page.");
} else {
  const STORAGE_KEY = "localProfilePhoto";

  // Load saved photo on page load
  const savedPhoto = localStorage.getItem(STORAGE_KEY);
  if (savedPhoto) {
    console.log("profilePictureLocal: loaded saved photo");
    previewImg.src = savedPhoto;
    previewImg.removeAttribute("aria-hidden");
    removeBtn.disabled = false;
  } else {
    previewImg.setAttribute("aria-hidden", "true");
    removeBtn.disabled = true;
  }

  // When user chooses a new picture
  fileInput.addEventListener("change", () => {
    console.log("profilePictureLocal: file input changed");
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      previewImg.src = base64;
      previewImg.removeAttribute("aria-hidden");
      removeBtn.disabled = false;
      localStorage.setItem(STORAGE_KEY, base64);
      console.log("profilePictureLocal: photo saved to localStorage");
    };
    reader.readAsDataURL(file);
  });

  // Remove picture
  removeBtn.addEventListener("click", () => {
    console.log("profilePictureLocal: remove button clicked");
    previewImg.src = "";
    previewImg.setAttribute("aria-hidden", "true");
    fileInput.value = "";
    removeBtn.disabled = true;
    localStorage.removeItem(STORAGE_KEY);
  });
}
