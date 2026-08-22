import { parseArgs } from 'node:util';
import { runOne, scanPreviews, scanReports } from './pipeline.js';
import { runRewrite } from './rewritePipeline.js';
import { checkAndPostNewArticles } from './sitemapWatch.js';

/**
 * CLI entry point.
 *   npm run preview -- --fixture 12345      draft one preview
 *   npm run report  -- --fixture 12345      draft one report
 *   npm run scan:previews                   scan monitored leagues for upcoming fixtures
 *   npm run scan:reports                    scan monitored leagues for finished fixtures
 *   npm run rewrite -- --url <article-url>  fetch + rewrite an article, save as a Google Doc
 *   npm run telegram:watch                  post newly-published Contentful articles to Telegram
 */
async function main() {
  const command = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: { fixture: { type: 'string' }, url: { type: 'string' } },
    allowPositionals: true,
  });

  switch (command) {
    case 'preview':
    case 'report': {
      if (!values.fixture) throw new Error(`Usage: npm run ${command} -- --fixture <id>`);
      await runOne(Number(values.fixture), command);
      break;
    }
    case 'scan-previews':
      await scanPreviews();
      break;
    case 'scan-reports':
      await scanReports();
      break;
    case 'rewrite': {
      if (!values.url) throw new Error('Usage: npm run rewrite -- --url <article-url>');
      await runRewrite(values.url);
      break;
    }
    case 'telegram-watch':
      await checkAndPostNewArticles();
      break;
    default:
      console.log(
        [
          'SportsHub automation — commands:',
          '  npm run preview -- --fixture <id>',
          '  npm run report  -- --fixture <id>',
          '  npm run scan:previews',
          '  npm run scan:reports',
          '  npm run rewrite -- --url <article-url>',
          '  npm run telegram:watch',
        ].join('\n'),
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n✗ Error details:', err);
  process.exit(1);
});
