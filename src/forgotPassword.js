// src/forgotPassword.js

import { auth } from "./firebaseConfig.js";
import { sendPasswordResetEmail } from "firebase/auth";

// we use  our existing input + link IDs
const emailInput = document.getElementById("loginEmail");
const forgotLink = document.getElementById("forgotPasswordLink");

if (forgotLink && emailInput) {
  forgotLink.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
      alert("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Reset password error:", error);
      alert("Could not send reset email. Check the email address or try again later.");
    }
  });
}
