import { config } from './config.js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

export async function generateCoverImage(title: string, slug: string): Promise<{ path: string } | null> {
  const { apiKey } = config.openai;
  if (!apiKey) {
    console.log('    (Skipping image generation: OPENAI_API_KEY not set in .env)');
    return null;
  }

  console.log(`  · generating cover image using DALL-E 3...`);

  const prompt = `A high-quality news editorial photo for a sports article titled: "${title}". Make it look professional, realistic, and photorealistic. No text or words in the image.`;

  try {
    const openai = new OpenAI({ apiKey });
    
    let response;
    try {
      response = await openai.images.generate({
        model: "gpt-image-2",
        prompt: prompt,
        n: 1,
        size: "1792x1024",
      } as any);
    } catch (err: any) {
      if (err.message?.includes('safety system') || err.status === 400) {
        console.log(`    ⚠️ Title triggered safety system, retrying with fallback generic sports prompt...`);
        const fallbackPrompt = `A high-quality news editorial illustration/photo representing sports news and athletic competition. Professional, realistic, cinematic lighting. No text or words in the image.`;
        response = await openai.images.generate({
          model: "gpt-image-2",
          prompt: fallbackPrompt,
          n: 1,
          size: "1792x1024",
        } as any);
      } else {
        throw err;
      }
    }

    const b64 = (response.data?.[0] as any)?.bytesBase64 || (response.data?.[0] as any)?.b64_json;
    if (!b64) throw new Error('No image returned');

    const buffer = Buffer.from(b64, 'base64');
    
    const articleDir = path.join(config.output.dir, slug);
    await mkdir(articleDir, { recursive: true });
    const filePath = path.join(articleDir, `${slug}.jpg`);
    await writeFile(filePath, buffer);

    return { path: filePath };
  } catch (err: any) {
    console.error(`    ✗ Image generation failed: ${err.message}`);
    return null;
  }
}
