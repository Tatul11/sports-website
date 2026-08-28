import { generateFactsCard } from '../src/factsCard.js';

const SLUG = 'champions-league-2026-27-guruh-bosqichi-qurasi';

const pots: { pot: number; teams: string[] }[] = [
  {
    pot: 1,
    teams: [
      'Paris Saint-Germain',
      'Bayern Munich',
      'Real Madrid',
      'Liverpool',
      'Inter Milan',
      'Manchester City',
      'Arsenal',
      'Barcelona',
      'Atlético Madrid',
    ],
  },
  {
    pot: 2,
    teams: [
      'Borussia Dortmund',
      'Roma',
      'Sporting CP',
      'Aston Villa',
      'Porto',
      'Manchester United',
      'Club Brugge',
      'Real Betis',
      'PSV Eindhoven',
    ],
  },
  {
    pot: 3,
    teams: [
      'Feyenoord',
      'Lille',
      'Bodø/Glimt',
      'Napoli',
      'RB Leipzig',
      'Villarreal',
      'Fenerbahçe',
      'Shakhtar Donetsk',
      'Galatasaray',
    ],
  },
  {
    pot: 4,
    teams: ['Slavia Prague', 'Slovan Bratislava', 'VfB Stuttgart', 'AEK Athens', 'LASK', 'Como', 'Lens', 'Viking', 'Sabah'],
  },
];

async function main() {
  for (const { pot, teams } of pots) {
    const result = await generateFactsCard(
      {
        kicker: 'CHAMPIONS LEAGUE 2026/27',
        headline: `${pot}-savat (Pot ${pot})`,
        items: teams.map((team, i) => ({ label: `${i + 1}`, value: team })),
      },
      SLUG,
      `pot-${pot}-table`,
    );
    console.log(`Pot ${pot} saved:`, result?.path);
  }
}

main();
