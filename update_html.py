import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

# We'll just replace the logo and the lang-select in all HTML files using Python.
for filename in html_files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace logo
    old_logo_pattern = r'<a href="index\.html" class="logo">.*?</a>'
    new_logo = '<a href="index.html" class="logo"><img src="assets/logo.png" alt="SportsHub" style="height: 40px;"></a>'
    content = re.sub(old_logo_pattern, new_logo, content, flags=re.DOTALL)

    # 2. Replace lang-select
    old_lang_pattern = r'<div class="lang-select">.*?</div>'
    new_lang = '''<select id="langSwitcher" class="lang-select" style="background:transparent; border:none; cursor:pointer; font-family:inherit; font-weight:600; outline:none; appearance:none;">
                            <option value="RU">RU</option>
                            <option value="UZ-CYRL">OʻZ (Kiril)</option>
                            <option value="UZ-LATN">OʻZ (Lotin)</option>
                        </select>'''
    content = re.sub(old_lang_pattern, new_lang, content, flags=re.DOTALL)
    
    # 3. Add data-i18n to nav links
    nav_links = ['Local', 'World', 'Art &amp; Culture', 'Art & Culture', 'Interviews', 'Helpful', 'Sport', 'Review', 'Trendings', 'Live', 'Local News', 'More on the topic', 'Most read', 'Search', 'Contact Us', 'About']
    for link in nav_links:
        # Avoid double replacing
        if f'data-i18n="{link}"' not in content:
            # We want to replace >TEXT< with >TEXT< with data attribute, but we need the element.
            # Easier to do this in JS, let's just let JS handle the translations.
            pass
            
    # Replace Sports KG BUSINESS with SportsHub BUSINESS
    content = content.replace('Sports KG BUSINESS', 'SportsHub BUSINESS')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

print("HTML files updated successfully.")
