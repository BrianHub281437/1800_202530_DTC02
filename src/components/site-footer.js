class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
             <footer class="site-footer">
     <div class="footer-container">

         <div class="footer-links">

<<<<<<< HEAD
             <a href="#">Back</a>
             <a href="#">Search</a>
             <a href="#">Bookmarks</a>

         </div>





             <!--
=======
                        <a href="#">Back</a>
                        <a href="search.html">Search</a>
                        <a href="bookmarks.html">Bookmarks</a>

                    </div>
                    <!--
>>>>>>> f376e9db442b402f2eec4798e20935cb18cbad89
        <p>&copy; 2025 Fridge.Nav | All Rights Reserved</p>
        <div class="footer-links">
          <a href="#">About</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Contact</a>
        </div>
        -->
<<<<<<< HEAD
         </div>
</footer>
=======
                </div>
            </footer>
>>>>>>> f376e9db442b402f2eec4798e20935cb18cbad89
        `;
    }
}

customElements.define('site-footer', SiteFooter);