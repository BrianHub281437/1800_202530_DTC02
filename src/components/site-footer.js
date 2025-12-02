// src/components/site-footer.js

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer">

        <nav class="bottom-nav">
          <a href="javascript:history.back()" class="bottom-nav-link">Back</a>
          <a href="/search.html" class="bottom-nav-link">Search</a>
          <a href="/bookmarks.html" class="bottom-nav-link">Bookmarks</a>
        </nav>

      </footer>
    `;
  }
}

customElements.define("site-footer", SiteFooter);
