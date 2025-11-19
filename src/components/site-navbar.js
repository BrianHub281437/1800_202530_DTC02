// Import specific functions from the Firebase Auth SDK
import {
    onAuthStateChanged,
} from "firebase/auth";

import { auth } from '/src/firebaseConfig.js';
import { logoutUser } from '/src/authentication.js';

class SiteNavbar extends HTMLElement {
    constructor() {
        super();
        this.renderNavbar();
        //this.renderAuthControls();
    }

    renderNavbar() {
        this.innerHTML = `
            <!-- Navbar: single source of truth -->
            <nav class="navbar navbar-expand-lg navbar-light bg-info">
                <div class="container-fluid">
<<<<<<< HEAD
                    <a class="navbar-brand" href="/">
                        <img src="https://www.creativefabrica.com/wp-content/uploads/2020/02/12/Food-Logo-Graphics-1-98.jpg" height="36">
                        Fridge.Nav
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
                        aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
=======
                    <a class="navbar-brand" href="main.html">Fridge.Nav</a>
                    <a class="nav-link" href="fridge.html">Fridge</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
>>>>>>> f376e9db442b402f2eec4798e20935cb18cbad89
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link" href="/">Home</a>
                            </li>
<<<<<<< HEAD
=======
                            <li class="nav-item">
                                <a class="nav-link" href="profile.html">Profile</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="about.html">About</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="privacypolicy.html">Privacy Policy</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="contact.html">Contact</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="login.html">Logout</a>
                            </li>
                            <!--
    <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            TEMP DROPDOWN IF NEEDED
        </a>
        <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#">Action</a></li>
            <li><a class="dropdown-item" href="#">Another action</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#">Something else here</a></li>
        </ul>
    </li>
    -->
                    <!--
    <li class="nav-item">
        <a class="nav-link disabled" aria-disabled="true">Disabled</a>
    </li>
    -->

>>>>>>> f376e9db442b402f2eec4798e20935cb18cbad89
                        </ul>
                        <div class="d-flex align-items-center gap-2 ms-lg-2" id="rightControls">
                            <form class="d-flex align-items-center gap-2 my-2 my-lg-0" id="navSearch" role="search">
                                <input class="form-control d-none d-sm-block w-auto" type="search" placeholder="Search" aria-label="Search">
                                <button class="btn btn-outline-light d-none d-sm-inline-block" type="submit">Search</button>
                            </form>
                            <div id="authControls" class="auth-controls d-flex align-items-center gap-2 my-2 my-lg-0">
                                <!-- populated by JS -->
                            </div>
                        </div>

                    </div>
                </div>
            </nav>
        `;
    }
<<<<<<< HEAD
=======
    /*
    renderAuthControls() {
        const authControls = this.querySelector('#authControls');
>>>>>>> f376e9db442b402f2eec4798e20935cb18cbad89

     // -------------------------------------------------------------
 // Renders the authentication controls (login/logout) based on user state
 // Uses Firebase Auth's onAuthStateChanged to listen for changes
 // and updates the navbar accordingly.
 // Also adds a "Profile" link when the user is logged in.
 // This keeps the navbar in sync with the user's authentication status.
 // -------------------------------------------------------------
renderAuthControls() {
  const authControls = this.querySelector('#authControls');
  const navList = this.querySelector('ul'); // your main nav <ul>

  // invisible placeholder to maintain layout
  authControls.innerHTML = `<div class="btn btn-outline-light" style="visibility: hidden; min-width: 80px;">Log out</div>`;

  onAuthStateChanged(auth, (user) => {
    let updatedAuthControl;

    // Remove existing "Profile" link if present (avoid duplicates)
    const existingProfile = navList?.querySelector('#profileLink');
    if (existingProfile) existingProfile.remove();

    if (user) {
      // 1️⃣ Add Profile item to menu
      if (navList) {
        const profileItem = document.createElement('li');
        profileItem.classList.add('nav-item');
        profileItem.innerHTML = `<a class="nav-link" id="profileLink" href="/profile.html">Profile</a>`;
        navList.appendChild(profileItem);
      }

      // 2️⃣ Show logout button
      updatedAuthControl = `<button class="btn btn-outline-light" id="signOutBtn" type="button" style="min-width: 80px;">Log out</button>`;
      authControls.innerHTML = updatedAuthControl;

      const signOutBtn = authControls.querySelector('#signOutBtn');
      signOutBtn?.addEventListener('click', logoutUser);
    } else {
      // Remove Profile if user logs out
      if (existingProfile) existingProfile.remove();

      // Show login button
      updatedAuthControl = `<a class="btn btn-outline-light" id="loginBtn" href="/login.html" style="min-width: 80px;">Log in</a>`;
      authControls.innerHTML = updatedAuthControl;
    }
<<<<<<< HEAD
  });
}
=======
    */
>>>>>>> f376e9db442b402f2eec4798e20935cb18cbad89
}

customElements.define('site-navbar', SiteNavbar);