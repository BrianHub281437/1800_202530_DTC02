class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <!-- Footer: single source of truth -->
            <footer class="site-footer">
                <div class="footer-container">

                    <div class="footer-links">

                        <a href="#">Back</a>
                        <a href="search.html">Search</a>
                        <a href="bookmarks.html">Bookmarks</a>

                    </div>
                    <!--
        <p>&copy; 2025 Fridge.Nav | All Rights Reserved</p>
        <div class="footer-links">
          <a href="#">About</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Contact</a>
        </div>
        -->
                </div>
            </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);