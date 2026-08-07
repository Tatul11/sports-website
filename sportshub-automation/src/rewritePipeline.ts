import { config } from './config.js';
import { fetchArticle } from './articleFetch.js';
import { generateRewrite } from './claude.js';
import { saveRewriteDocx } from './docWriter.js';
import { uploadToGoogleDrive } from './googleDrive.js';
import { generateCoverImage } from './imageGen.js';

/** Fetch an article by URL, rewrite it in 3 locales, and save the result as a .docx file
 *  in OUTPUT_DIR. This replaces the CMS-draft step for this workflow. */
export async function runRewrite(url: string): Promise<void> {
  console.log(`  · fetching ${url}`);
  const source = await fetchArticle(url);

  console.log(`  · extracted "${source.title}" (${source.textContent.length} chars) — rewriting in 3 locales...`);
  const rewritten = await generateRewrite(source);

  console.log('  · writing .docx files...');
  const docs = await saveRewriteDocx(rewritten, source, config.claude.model);

  for (const docPath of docs.paths) {
    console.log(`    → saved: ${docPath}`);
    const docLink = await uploadToGoogleDrive(docPath);
    if (docLink) console.log(`    → Google Drive: ${docLink}`);
  }

  const image = await generateCoverImage(source.title, rewritten.slug);
  if (image) {
    console.log(`    → saved image: ${image.path}`);
    const imgLink = await uploadToGoogleDrive(image.path);
    if (imgLink) console.log(`    → Google Drive (image): ${imgLink}`);
  }
}
