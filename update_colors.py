import os

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for filename in html_files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace hardcoded red colors
    content = content.replace('#E31B23', 'var(--primary-color)')
    
    # Check for other color formats like #e31b23
    content = content.replace('#e31b23', 'var(--primary-color)')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

print("Hardcoded red colors replaced successfully.")
