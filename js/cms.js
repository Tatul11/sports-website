
const SPACE_ID = 'lk7wvlqdutqz';
const ACCESS_TOKEN = '4QKvL7hxF_s93ZyU7B9U28goB9_SugN0eGRexY0DXtI';

// Fetch articles from Contentful
async function fetchArticles(category = null) {
    let url = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=article`;
    if (category) {
        url += `&fields.category=${encodeURIComponent(category)}`;
    }
    // Sort by newest first
    url += `&order=-sys.createdAt`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return [];
        }

        // Map assets
        const assets = {};
        if (data.includes && data.includes.Asset) {
            data.includes.Asset.forEach(asset => {
                assets[asset.sys.id] = asset.fields.file.url;
            });
        }

        return data.items.map(item => {
            let imageUrl = 'assets/football_hero_1779970898361.png'; // Fallback
            if (item.fields.image && item.fields.image.sys) {
                const assetId = item.fields.image.sys.id;
                if (assets[assetId]) {
                    imageUrl = 'https:' + assets[assetId];
                }
            }

            // Format date
            const date = new Date(item.sys.createdAt);
            const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

            return {
                id: item.sys.id,
                title: item.fields.title || 'Untitled',
                slug: item.fields.slug || item.sys.id,
                category: item.fields.category || 'General',
                content: item.fields.content || '',
                imageUrl: imageUrl,
                date: dateStr
            };
        });
    } catch (error) {
        console.error('Error fetching CMS articles:', error);
        return [];
    }
}

// Fetch single article
async function fetchArticleById(id) {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/master/entries/${id}?access_token=${ACCESS_TOKEN}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.sys.type === 'Error') {
            return null;
        }

        // To get the image, we need to fetch the asset specifically because single entry doesn't include linked assets by default,
        // Wait, it's easier to just fetch all matching id to get includes.
        const searchUrl = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&sys.id=${id}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        
        if (!searchData.items || searchData.items.length === 0) return null;
        
        const item = searchData.items[0];
        
        const assets = {};
        if (searchData.includes && searchData.includes.Asset) {
            searchData.includes.Asset.forEach(asset => {
                assets[asset.sys.id] = asset.fields.file.url;
            });
        }

        let imageUrl = 'assets/football_hero_1779970898361.png';
        if (item.fields.image && item.fields.image.sys) {
            const assetId = item.fields.image.sys.id;
            if (assets[assetId]) {
                imageUrl = 'https:' + assets[assetId];
            }
        }

        const date = new Date(item.sys.createdAt);
        const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        return {
            id: item.sys.id,
            title: item.fields.title || 'Untitled',
            slug: item.fields.slug || item.sys.id,
            category: item.fields.category || 'General',
            content: item.fields.content || '',
            imageUrl: imageUrl,
            date: dateStr
        };
    } catch (error) {
        console.error('Error fetching article:', error);
        return null;
    }
}

// Render horizontal card
function renderHorizontalCard(article) {
    return `
        <a href="article.html?id=${article.id}" class="news-card-h">
            <img src="${article.imageUrl}" alt="${article.title}" style="object-fit:cover;">
            <div class="news-card-h-content">
                <h3 class="news-card-h-title">${article.title}</h3>
                <div class="meta">
                    <span class="meta-item"><i class="far fa-clock"></i> ${article.date}</span>
                </div>
            </div>
        </a>
    `;
}

// Render vertical card
function renderVerticalCard(article) {
    return `
        <a href="article.html?id=${article.id}" class="news-card-v">
            <img src="${article.imageUrl}" alt="${article.title}" style="object-fit:cover;">
            <div class="news-card-v-content">
                <h3 class="news-card-v-title">${article.title}</h3>
                <div class="meta">
                    <span><i class="far fa-clock"></i> ${article.date}</span>
                </div>
            </div>
        </a>
    `;
}

// Initialize CMS content on page load
document.addEventListener('DOMContentLoaded', async () => {
    
    // Determine if we are on the article page
    if (window.location.pathname.includes('article.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        
        if (articleId) {
            const article = await fetchArticleById(articleId);
            if (article) {
                // Replace article content
                const titleEl = document.querySelector('.article-title');
                const imgEl = document.querySelector('.article-main-image');
                const contentEl = document.querySelector('.article-text');
                const dateEl = document.querySelector('.article-meta .meta-item:first-child');
                
                if (titleEl) titleEl.textContent = article.title;
                if (imgEl) imgEl.src = article.imageUrl;
                if (dateEl) dateEl.innerHTML = `<i class="far fa-clock"></i> ${article.date}`;
                
                // For rich text we might need a parser, but assuming plain HTML or text for now
                // Contentful rich text is complex, if it's plain text we replace newlines
                if (contentEl) {
                    let htmlContent = '';
                    if (typeof article.content === 'object') {
                        // Very basic rich text parser fallback
                        htmlContent = '<p>Rich text content from CMS. Please ensure you output HTML or simple text in the CMS field.</p>';
                        try {
                            // If they use rich text, we'd need @contentful/rich-text-html-renderer
                            // but we'll try a simple stringify just in case
                            htmlContent = '<pre style="white-space:pre-wrap;">' + JSON.stringify(article.content, null, 2) + '</pre>';
                        } catch(e){}
                    } else {
                        htmlContent = article.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
                    }
                    contentEl.innerHTML = htmlContent;
                }
            }
        }
        return; // Don't run grid logic on article page
    }

    // Grid population logic for Homepage and Section pages
    const containers = document.querySelectorAll('[data-cms-category]');
    
    for (const container of containers) {
        const category = container.getAttribute('data-cms-category');
        const limit = parseInt(container.getAttribute('data-cms-limit')) || 10;
        const style = container.getAttribute('data-cms-style') || 'horizontal';
        
        let articles = [];
        if (category === 'All' || category === 'Local News') {
            // Fetch everything or 'Local'
            articles = await fetchArticles(category === 'Local News' ? 'Local' : null);
        } else {
            articles = await fetchArticles(category);
        }

        // Fallback: If CMS is empty, keep existing HTML
        if (articles.length === 0) continue;

        // Otherwise replace with CMS content
        container.innerHTML = '';
        const itemsToRender = articles.slice(0, limit);
        
        itemsToRender.forEach(article => {
            if (style === 'vertical') {
                container.innerHTML += renderVerticalCard(article);
            } else {
                container.innerHTML += renderHorizontalCard(article);
            }
        });
    }
});
