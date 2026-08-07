import { google } from 'googleapis';
import { createReadStream } from 'node:fs';
import { config } from './config.js';
import path from 'node:path';

/**
 * Uploads a file to Google Drive using a Service Account.
 */
export async function uploadToGoogleDrive(filePath: string): Promise<string | null> {
  const { clientEmail, privateKey, driveFolderId } = config.google;

  if (!clientEmail || !privateKey || !driveFolderId) {
    console.log('    (Skipping Google Drive upload: credentials not fully configured in .env)');
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    console.log('    · uploading to Google Drive...');
    
    const response = await drive.files.create({
      requestBody: {
        name: path.basename(filePath),
        parents: [driveFolderId],
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: createReadStream(filePath),
      },
      fields: 'id, webViewLink',
    });

    return response.data.webViewLink ?? null;
  } catch (err: any) {
    console.error(`    ✗ Google Drive upload failed: ${err.message}`);
    return null;
  }
}
