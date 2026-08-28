import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, 'assets', 'fonts');

export interface FactsCardData {
  /** Small pill label above the headline, e.g. "ТРАНСФЕР", "NBA". */
  kicker: string;
  headline: string;
  items: { label: string; value: string }[];
}

let fontsCache: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | null = null;

function loadFonts() {
  if (fontsCache) return fontsCache;
  fontsCache = [
    { name: 'Roboto', data: fs.readFileSync(path.join(FONTS_DIR, 'Roboto-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
    { name: 'Roboto', data: fs.readFileSync(path.join(FONTS_DIR, 'Roboto-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
  ];
  return fontsCache;
}

/** Renders a stat/fact card as a PNG — real data laid out with real typography,
 *  not an AI-generated image, so numbers and names are always exactly right. */
export async function generateFactsCard(
  data: FactsCardData,
  slug: string,
  fileName: string = `${slug}-facts-card`,
): Promise<{ path: string } | null> {
  const width = 1200;
  // Height adapts to row count — a 5-row fact sheet and a 9-row roster list need
  // very different amounts of space, and a fixed height caused rows to overflow
  // past the card edge (and squeeze into the kicker/headline) once past ~6 items.
  const height = Math.round(360 + data.items.length * 58);

  const tree = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0B1220',
        backgroundImage: 'linear-gradient(135deg, #0B1220 0%, #101C36 60%, #14264A 100%)',
        padding: '64px 72px',
        fontFamily: 'Roboto',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: '#F97316',
              color: '#0B1220',
              fontSize: 26,
              fontWeight: 700,
              padding: '8px 22px',
              borderRadius: 999,
              letterSpacing: 2,
              textTransform: 'uppercase',
            },
            children: data.kicker,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: '#FFFFFF',
              fontSize: 46,
              fontWeight: 700,
              lineHeight: 1.25,
              marginTop: 28,
              maxWidth: 1020,
            },
            children: data.headline,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginTop: 48,
              gap: 16,
            },
            children: data.items.map((item, i) => ({
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'baseline',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        color: '#93A3C4',
                        fontSize: 26,
                        fontWeight: 400,
                        width: 340,
                      },
                      children: item.label,
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        color: '#FFFFFF',
                        fontSize: 30,
                        fontWeight: 700,
                      },
                      children: item.value,
                    },
                  },
                ],
              },
            })),
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: '#4C5C82',
              fontSize: 22,
              fontWeight: 700,
              marginTop: 36,
              letterSpacing: 1,
            },
            children: 'SPORTSHUB.UZ',
          },
        },
      ],
    },
  };

  const svg = await satori(tree as any, { width, height, fonts: loadFonts() });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const png = resvg.render().asPng();

  const articleDir = path.join(config.output.dir, slug);
  fs.mkdirSync(articleDir, { recursive: true });
  const filePath = path.join(articleDir, `${fileName}.png`);
  fs.writeFileSync(filePath, png);

  return { path: filePath };
}
