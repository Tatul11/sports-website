import { config } from './config.js';

function requireTelegramConfig() {
  if (!config.telegram.botToken || !config.telegram.channelId) {
    throw new Error(
      'Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID in .env — see .env.example.',
    );
  }
}

/** Post one article announcement to the configured Telegram channel: an emoji-tagged
 *  title plus a "Read more" button. The article URL is also embedded as an invisible
 *  (zero-width) link so Telegram still builds its usual preview card (image,
 *  description) from the page's OG tags, without showing a second visible link. */
export async function postArticleToTelegram(article: {
  title: string;
  url: string;
  emoji: string;
}): Promise<void> {
  requireTelegramConfig();

  const text = `${article.emoji} <b>${escapeHtml(article.title)}</b><a href="${article.url}">​</a>`;

  const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegram.channelId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: "Batafsil o'qish →", url: article.url }]],
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
