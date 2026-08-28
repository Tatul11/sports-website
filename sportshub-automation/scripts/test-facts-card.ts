import { generateFactsCard } from '../src/factsCard.js';

async function main() {
  const result = await generateFactsCard(
    {
      kicker: 'ТРАНСФЕР · НБА',
      headline: '«Миннесота» подписала чемпиона НБА Жонатана Кумингу',
      items: [
        { label: 'Новый клуб', value: '«Миннесота Тимбервулвз»' },
        { label: 'Контракт', value: '2 года, $12,4 млн' },
        { label: 'Также претендовали', value: 'Лейкерс, Майами, Чикаго, Портленд' },
        { label: 'Титулы', value: 'Чемпион НБА 2022 (Голден Стэйт)' },
        { label: 'Драфт', value: '7-й пик драфта 2021 года' },
      ],
    },
    'minnesota-kuminga-timberwolves-nba',
  );
  console.log('Saved:', result?.path);
}

main();
