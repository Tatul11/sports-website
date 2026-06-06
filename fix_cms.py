import os

cms_path = "js/cms.js"

with open(cms_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace the language switcher event listener.
old_listener = """        langSwitcher.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('sportsHubLang', currentLang);
            translateUI();
            
            // Re-render grids if not on article page
            if (!window.location.pathname.includes('article.html')) {
                renderGrids();
            } else {
                // If on article page, might be better to redirect home or keep as is since the article ID is bound to a specific language.
                // We'll just redirect to home for simplicity when changing language on an article.
                window.location.href = 'index.html';
            }
        });"""

new_listener = """        langSwitcher.addEventListener('change', async (e) => {
            currentLang = e.target.value;
            localStorage.setItem('sportsHubLang', currentLang);
            translateUI();
            
            if (!window.location.pathname.includes('article.html')) {
                renderGrids();
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                const articleId = urlParams.get('id');
                if (articleId) {
                    // Try to find the matching article in the new language
                    const currentArticle = await fetchArticleById(articleId);
                    if (currentArticle && currentArticle.slug) {
                        // The slug format is `langDir-baseSlug` e.g. `ru-samarkand-antalya`
                        const baseSlug = currentArticle.slug.replace(/^(ru|uz-cyrl|uz-latn)-/, '');
                        const newLangDir = currentLang === 'RU' ? 'ru' : (currentLang === 'UZ-CYRL' ? 'uz-cyrl' : 'uz-latn');
                        const newSlug = newLangDir + '-' + baseSlug;
                        
                        // Query Contentful for an article with the new slug
                        const searchUrl = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=article&fields.slug=${newSlug}`;
                        try {
                            const res = await fetch(searchUrl);
                            const data = await res.json();
                            if (data.items && data.items.length > 0) {
                                // Found the translated article! Redirect to it seamlessly
                                window.location.href = `article.html?id=${data.items[0].sys.id}`;
                                return;
                            }
                        } catch (err) {
                            console.error('Failed to fetch translated article', err);
                        }
                    }
                }
                window.location.href = 'index.html';
            }
        });"""

content = content.replace(old_listener, new_listener)

with open(cms_path, "w", encoding="utf-8") as f:
    f.write(content)

print("cms.js updated for seamless article translation switching.")
