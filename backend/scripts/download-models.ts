/**
 * Downloads face-api.js SSD MobileNet v1 model files from the
 * vladmandic/face-api GitHub repository into the ./models directory.
 *
 * Usage: npm run download-models
 */
import https from 'https';
import fs from 'fs';
import path from 'path';

const BASE_URL =
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

const MODEL_FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
];

const MODELS_DIR = path.join(__dirname, '../models');

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(response.headers.location!, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });

    file.on('error', (err) => {
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function main(): Promise<void> {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log(`Downloading face detection models to ${MODELS_DIR}...\n`);

  for (const filename of MODEL_FILES) {
    const destPath = path.join(MODELS_DIR, filename);

    if (fs.existsSync(destPath)) {
      console.log(`  ✓ ${filename} (already exists)`);
      continue;
    }

    process.stdout.write(`  ↓ ${filename}...`);
    try {
      await downloadFile(`${BASE_URL}${filename}`, destPath);
      const size = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1);
      console.log(` done (${size} MB)`);
    } catch (err) {
      console.log(` FAILED`);
      console.error(`    Error: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  console.log('\nAll models downloaded successfully!');
  console.log('Restart the server to enable face detection.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
