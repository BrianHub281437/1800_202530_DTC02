class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <!-- Footer: single source of truth -->
            <footer class="site-footer">
                <div class="footer-container">

                    <div class="footer-links">

                        <a href="#">Back</a>
                        <a href="#">Search</a>
                        <a href="#">Bookmarks</a>

                    </div>
                </div>
            </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);