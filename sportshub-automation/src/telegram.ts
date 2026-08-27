import { config } from './config.js';

/** Post one article announcement to a Telegram channel: an emoji-tagged title plus a
 *  "Read more" button. The article URL is also embedded as an invisible (zero-width)
 *  link so Telegram still builds its usual preview card (image, description) from the
 *  page's OG tags, without showing a second visible link. `channelId` and `buttonText`
 *  let the same bot post to different channels in different languages. */
export async function postArticleToTelegram(article: {
  title: string;
  url: string;
  emoji: string;
  channelId: string;
  buttonText: string;
}): Promise<void> {
  if (!config.telegram.botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN in .env — see .env.example.');
  }

  const text = `${article.emoji} <b>${escapeHtml(truncateTitle(article.title))}</b><a href="${article.url}">​</a>`;

  const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: article.channelId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: article.buttonText, url: article.url }]],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error: ${res.status} ${body}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Keeps the post's headline to roughly one line on a phone screen — the full title
// still shows on the site itself, this only shortens what appears in the Telegram text.
const MAX_TITLE_LENGTH = 55;

function truncateTitle(title: string): string {
  if (title.length <= MAX_TITLE_LENGTH) return title;
  return `${title.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}
