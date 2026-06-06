import os

cms_path = "js/cms.js"
with open(cms_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace 'Trendings' with 'Trending'
content = content.replace("'Trendings':", "'Trending':")
content = content.replace("'Trendings'", "'Trending'")

with open(cms_path, "w", encoding="utf-8") as f:
    f.write(content)

print("cms.js updated to fix Trending map.")
