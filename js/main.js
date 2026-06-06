// main.js

document.addEventListener('DOMContentLoaded', () => {
    // Basic interaction for search icon
    const searchIcon = document.querySelector('.search-icon');
    if(searchIcon) {
        searchIcon.addEventListener('click', () => {
            console.log('Search clicked');
            // In a real app, this would open a search modal
        });
    }

    // Add sticky class on scroll (optional enhancement)
    const header = document.querySelector('.main-nav-wrapper');
    if(header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }
        });
    }

    // Interactive load more button
    const loadMoreBtn = document.querySelector('.btn-load-more');
    if(loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-check"></i> Loaded';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-redo-alt" style="margin-right:8px;"></i> Load more news';
                }, 2000);
            }, 1000);
        });
    }
});
