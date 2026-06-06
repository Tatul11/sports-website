import os

cms_path = "js/cms.js"

with open(cms_path, "r", encoding="utf-8") as f:
    cms_content = f.read()

new_cms_content = """
const SPACE_ID = 'lk7wvlqdutqz';
const ACCESS_TOKEN = '4QKvL7hxF_s93ZyU7B9U28goB9_SugN0eGRexY0DXtI';

const I18N_MAP = {
    'RU': {
        'Local': 'Местные',
        'World': 'В мире',
        'Art & Culture': 'Искусство и Культура',
        'Interviews': 'Интервью',
        'Helpful': 'Полезное',
        'Sport': 'Спорт',
        'Review': 'Обзор',
        'Trendings': 'В тренде',
        'Live': 'В эфире',
        'Local News': 'Местные новости',
        'More on the topic': 'Больше по теме',
        'Most read': 'Самые читаемые',
        'Search': 'Поиск',
        'Contact Us': 'Связаться с нами',
        'About': 'О нас',
        'SportsHub BUSINESS': 'SportsHub БИЗНЕС',
        'Learn for you': 'Узнайте для себя',
        'we are on facebook too': 'мы также в facebook'
    },
    'UZ-CYRL': {
        'Local': 'Маҳаллий',
        'World': 'Дунёда',
        'Art & Culture': 'Санъат ва Маданият',
        'Interviews': 'Интервюлар',
        'Helpful': 'Фойдали',
        'Sport': 'Спорт',
        'Review': 'Шарҳ',
        'Trendings': 'Трендлар',
        'Live': 'Жонли',
        'Local News': 'Маҳаллий янгиликлар',
        'More on the topic': 'Мавзуга оид',
        'Most read': 'Энг кўп ўқилган',
        'Search': 'Қидириш',
        'Contact Us': 'Биз билан боғланиш',
        'About': 'Биз ҳақимизда',
        'SportsHub BUSINESS': 'SportsHub БИЗНЕС',
        'Learn for you': 'Ўзингиз учун билинг',
        'we are on facebook too': 'биз фейсбукдамиз'
    },
    'UZ-LATN': {
        'Local': 'Mahalliy',
        'World': 'Dunyoda',
        'Art & Culture': 'San\\'at va Madaniyat',
        'Interviews': 'Intervyular',
        'Helpful': 'Foydali',
        'Sport': 'Sport',
        'Review': 'Sharh',
        'Trendings': 'Trendlar',
        'Live': 'Jonli',
        'Local News': 'Mahalliy yangiliklar',
        'More on the topic': 'Mavzuga oid',
        'Most read': 'Eng ko\\'p o\\'qilgan',
        'Search': 'Qidirish',
        'Contact Us': 'Biz bilan bog\\'lanish',
        'About': 'Biz haqimizda',
        'SportsHub BUSINESS': 'SportsHub BIZNES',
        'Learn for you': 'O\\'zingiz uchun biling',
        'we are on facebook too': 'biz facebookdamiz'
    }
};

let currentLang = localStorage.getItem('sportsHubLang') || 'RU';

function translateUI() {
    const map = I18N_MAP[currentLang];
    if (!map) return;

    // A fast way to translate: recursively check text nodes
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let n;
    const nodesToTranslate = [];
    while (n = walk.nextNode()) {
        const text = n.nodeValue.trim();
        if (text.length > 0) {
            // Save original English in a data attribute on parent if not exists
            if (!n.parentElement.hasAttribute('data-orig-en')) {
                // If it's currently English, save it
                // We assume default HTML is English
                // Or we can just check if we have a mapping for the text backwards
                n.parentElement.setAttribute('data-orig-en', text);
            }
            nodesToTranslate.push(n);
        }
    }

    nodesToTranslate.forEach(n => {
        const origEn = n.parentElement.getAttribute('data-orig-en');
        if (origEn && map[origEn]) {
            n.nodeValue = map[origEn];
        } else if (origEn === 'RU' || origEn === 'OʻZ (Kiril)' || origEn === 'OʻZ (Lotin)') {
            // keep language switcher text
        }
    });

    // Translate placeholders
    document.querySelectorAll('input[placeholder]').forEach(input => {
        if (!input.hasAttribute('data-orig-en-ph')) {
            input.setAttribute('data-orig-en-ph', input.getAttribute('placeholder'));
        }
        const orig = input.getAttribute('data-orig-en-ph');
        if (map[orig]) input.setAttribute('placeholder', map[orig]);
    });
}

function stripLangPrefix(title) {
    return title.replace(/^\\[(RU|UZ-CYRL|UZ-LATN)\\]\\s*/i, '');
}

// Fetch articles from Contentful
async function fetchArticles(category = null) {
    let url = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=article`;
    if (category) {
        url += `&fields.category=${encodeURIComponent(category)}`;
    }
    url += `&order=-sys.createdAt`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) return [];

        const assets = {};
        if (data.includes && data.includes.Asset) {
            data.includes.Asset.forEach(asset => {
                assets[asset.sys.id] = asset.fields.file.url;
            });
        }

        let articles = data.items.map(item => {
            let imageUrl = 'assets/football_hero_1779970898361.png';
            if (item.fields.image && item.fields.image.sys) {
                const assetId = item.fields.image.sys.id;
                if (assets[assetId]) imageUrl = 'https:' + assets[assetId];
            }

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

        // Filter by current language
        articles = articles.filter(a => a.title.toUpperCase().startsWith(`[${currentLang}]`));
        
        // Strip prefix
        articles.forEach(a => {
            a.title = stripLangPrefix(a.title);
        });

        return articles;
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
        if (data.sys.type === 'Error') return null;

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
            if (assets[assetId]) imageUrl = 'https:' + assets[assetId];
        }

        const date = new Date(item.sys.createdAt);
        const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        return {
            id: item.sys.id,
            title: stripLangPrefix(item.fields.title || 'Untitled'),
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

async function renderGrids() {
    const containers = document.querySelectorAll('[data-cms-category]');
    for (const container of containers) {
        const category = container.getAttribute('data-cms-category');
        const limit = parseInt(container.getAttribute('data-cms-limit')) || 10;
        const style = container.getAttribute('data-cms-style') || 'horizontal';
        
        let articles = [];
        if (category === 'All' || category === 'Local News') {
            articles = await fetchArticles(category === 'Local News' ? 'Local' : null);
        } else {
            articles = await fetchArticles(category);
        }

        if (articles.length === 0) {
            container.innerHTML = `<p style="padding: 20px; color: #888;">No articles found for ${currentLang}.</p>`;
            continue;
        }

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
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // Language Switcher Event
    const langSwitcher = document.getElementById('langSwitcher');
    if (langSwitcher) {
        langSwitcher.value = currentLang;
        langSwitcher.addEventListener('change', (e) => {
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
        });
    }

    translateUI();

    if (window.location.pathname.includes('article.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        
        if (articleId) {
            const article = await fetchArticleById(articleId);
            if (article) {
                const titleEl = document.querySelector('.article-title');
                const imgEl = document.querySelector('.article-main-image');
                const contentEl = document.querySelector('.article-text');
                const dateEl = document.querySelector('.article-meta .meta-item:first-child');
                
                if (titleEl) titleEl.textContent = article.title;
                if (imgEl) imgEl.src = article.imageUrl;
                if (dateEl) dateEl.innerHTML = `<i class="far fa-clock"></i> ${article.date}`;
                
                if (contentEl) {
                    let htmlContent = '';
                    if (typeof article.content === 'object') {
                        htmlContent = '<p>Rich text content from CMS. Please ensure you output HTML or simple text in the CMS field.</p>';
                    } else {
                        htmlContent = article.content.split('\\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
                    }
                    contentEl.innerHTML = htmlContent;
                }
            }
        }
        return; 
    }

    await renderGrids();
});
"""

with open(cms_path, "w", encoding="utf-8") as f:
    f.write(new_cms_content)

print("cms.js updated successfully.")
