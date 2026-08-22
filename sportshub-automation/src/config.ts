import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return v.trim();
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

export const config = {
  claude: {
    // Optional at load time — only needed for pipelines that actually call Claude
    // (preview/report/scan:*/rewrite). telegram-watch never touches this.
    apiKey: optional('ANTHROPIC_API_KEY', ''),
    model: optional('CLAUDE_MODEL', 'claude-sonnet-5'),
  },
  openai: {
    apiKey: optional('OPENAI_API_KEY', ''),
  },
  football: {
    // Optional at load time — only needed for the football-API pipeline (preview/report/scan:*).
    // Validated when actually used, so the URL-rewrite pipeline doesn't require it.
    apiKey: optional('FOOTBALL_API_KEY', ''),
    base: optional('FOOTBALL_API_BASE', 'https://v3.football.api-sports.io'),
    leagueIds: optional('MONITOR_LEAGUE_IDS', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number),
    season: Number(optional('SEASON', String(new Date().getFullYear()))),
  },
  cms: {
    // Optional at load time — only needed for the football-API pipeline. See football.apiKey note above.
    url: optional('CMS_API_URL', ''),
    token: optional('CMS_API_TOKEN', ''),
    authorSlug: optional('DEFAULT_AUTHOR_SLUG', 'redaksiya'),
    draftStatus: optional('DRAFT_STATUS', 'draft'),
  },
  output: {
    // Only used by the URL-rewrite pipeline (rewrite command → .docx file).
    // Point this at a Google Drive desktop-sync folder to have files upload themselves —
    // no Google API/OAuth setup needed either way.
    dir: optional('OUTPUT_DIR', './output'),
  },
  google: {
    // Used for automatically uploading .docx files via the Google Drive API.
    clientEmail: optional('GOOGLE_SERVICE_ACCOUNT_EMAIL', ''),
    privateKey: optional('GOOGLE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    driveFolderId: optional('GOOGLE_DRIVE_FOLDER_ID', '1EqWX_8MFc1llO3o0rs8B-E04mt_aok_p'),
  },
  behaviour: {
    previewLookaheadHours: Number(optional('PREVIEW_LOOKAHEAD_HOURS', '48')),
    reportLookbackHours: Number(optional('REPORT_LOOKBACK_HOURS', '6')),
    tzOffset: optional('TZ_OFFSET', '+05:00'),
  },
  telegram: {
    // Only needed for the telegram-watch command.
    botToken: optional('TELEGRAM_BOT_TOKEN', ''),
    channelId: optional('TELEGRAM_CHANNEL_ID', ''),
  },
  site: {
    // Used by telegram-watch to read the Google News sitemap (last-48h published articles).
    baseUrl: optional('SITE_BASE_URL', 'https://sportshub.uz'),
  },
} as const;

export const LOCALES = ['uz-Latn', 'uz-Cyrl', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
