import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import type { RewrittenArticle, RewrittenLocale, SourceArticle } from './types.js';

const LOCALE_LABELS: Record<string, string> = {
  'uz-Cyrl': 'ЎЗБЕК (КИРИЛЛ) - UZ-CYRL',
  'uz-Latn': "O'ZBEK (LOTIN) - UZ-LATN",
  ru: 'РУССКИЙ - RU',
};

function labeledParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
  });
}

function buildSingleDocument(locale: RewrittenLocale, source: SourceArticle, modelName: string, category: string, slug: string): Document {
  const children: Paragraph[] = [
    new Paragraph({ text: locale.title.replace(/—/g, '-'), heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: LOCALE_LABELS[locale.locale] || locale.locale, heading: HeadingLevel.HEADING_2 }),
    labeledParagraph('Title', locale.title.replace(/—/g, '-')),
    labeledParagraph('H2 Подзаголовок (показывается под заголовком)', locale.subtitle.replace(/—/g, '-')),
    labeledParagraph('Дополнительное описание', locale.shortDescription.replace(/—/g, '-')),
    labeledParagraph('URL Slug', `${category}/${slug}`),
    labeledParagraph('Meta title', locale.metaTitle.replace(/—/g, '-')),
    labeledParagraph('Meta description', locale.metaDescription.replace(/—/g, '-')),
    new Paragraph({ text: '' }),
    new Paragraph({ text: locale.leadParagraph.replace(/—/g, '-') }),
    new Paragraph({ text: '' }),
  ];

  for (const p of locale.bodyParagraphs) {
    children.push(new Paragraph({ text: p.replace(/—/g, '-') }));
    children.push(new Paragraph({ text: '' }));
  }

  return new Document({ sections: [{ children }] });
}

/** Writes the trilingual rewrite as three separate .docx files into a slug-named subdirectory in config.output.dir. */
export async function saveRewriteDocx(
  article: RewrittenArticle,
  source: SourceArticle,
  modelName: string,
): Promise<{ paths: string[] }> {
  const articleDir = path.join(config.output.dir, article.slug);
  await mkdir(articleDir, { recursive: true });

  const paths: string[] = [];

  for (const locale of article.locales) {
    const buffer = await Packer.toBuffer(buildSingleDocument(locale, source, modelName, article.category, article.slug));
    const filePath = path.join(articleDir, `${article.slug}-${locale.locale}.docx`);
    await writeFile(filePath, buffer);
    paths.push(filePath);
  }

  return { paths };
}
