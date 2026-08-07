import Anthropic from '@anthropic-ai/sdk';
import { config } from './src/config.js';
import { REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './src/rewritePrompts.js';

const client = new Anthropic({ apiKey: config.claude.apiKey });

async function run() {
  const article = {
    url: 'https://tribuna.uz/ru/news/schet-bunyodkora-neaktiven-budet-zafiksirovano-tehnicheskoe-porazhenie-v-matche-s-kizilkumom-1299835/',
    title: 'Счет "Бунёдкора" неактивен. Будет зафиксировано техническое поражение в матче с "Кизилкумом"',
    textContent: `«Бунёдкор», имеющий задолженность по зарплате перед бывшими футболистами, может получить техническое поражение в ближайшем матче против «Кизилкума» из-за запрета на регистрацию новых игроков.
Счет «Бунёдкора» неактивен из-за долгов перед экс-игроками. По этой причине клуб не смог зарегистрировать новых игроков.
Как стало известно Tribuna.uz, «Бунёдкору» грозит техническое поражение в матче 14-го тура Суперлиги против «Кизилкума». Причина в том, что у клуба не наберется достаточно игроков для участия в матче.
Ранее ПФЛУз предупреждала, что клубам, имеющим задолженности, будет запрещено регистрировать новых игроков, и они могут быть не допущены к матчам Суперлиги. «Бунёдкор» пока не решил эту проблему.`
  };
  
  try {
    const msg = await client.messages.create({
      model: config.claude.model,
      max_tokens: 15000,
      system: REWRITE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildRewriteUserPrompt(article) }],
    });
    console.log(JSON.stringify(msg, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
