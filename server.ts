import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Upload custom logo image (base64 PNG)
app.post('/api/upload-logo', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fs = await import('fs/promises');
    await fs.writeFile(path.resolve(__dirname, 'public', 'honeymoney-icon.png'), buffer);
    try {
      await fs.writeFile(path.resolve(__dirname, 'dist', 'honeymoney-icon.png'), buffer);
    } catch {}

    res.json({ success: true, url: '/honeymoney-icon.png' });
  } catch (err: any) {
    console.error('Error saving logo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Download Android Studio project as a complete ZIP
app.get('/api/download-android-project', (req, res) => {
  try {
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment('Honeymoney-Android-v1.0.zip');

    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Append the android folder
    const androidPath = path.resolve(__dirname, 'android');
    archive.directory(androidPath, 'android');

    // Append root config files needed for building
    archive.file(path.resolve(__dirname, 'capacitor.config.json'), { name: 'capacitor.config.json' });
    archive.file(path.resolve(__dirname, 'package.json'), { name: 'package.json' });

    // Include instructions
    const readmeContent = `# Honeymoney v1.0 - Android Studio Project
Generated for: animesharma2405@gmail.com

## How to Build your APK in Android Studio:
1. Open Android Studio.
2. Click "Open" (or File -> Open).
3. Select the "android" folder inside this directory.
4. Wait for Gradle sync to complete.
5. In the top menu, go to:
   Build -> Build Bundle(s) / APK(s) -> Build APK(s)
6. Once the build finishes, click "locate" in the popup to get your app-debug.apk!
`;
    archive.append(readmeContent, { name: 'README_ANDROID_STUDIO.txt' });

    archive.finalize();
  } catch (err: any) {
    console.error('Error generating ZIP:', err);
    res.status(500).json({ error: 'Failed to create zip file' });
  }
});




async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Honeymoney server running on http://localhost:${PORT}`);
  });
}

startServer();
