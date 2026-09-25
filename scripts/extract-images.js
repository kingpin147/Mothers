const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'Pre-membership website pages', '.image-slots.state.json');
if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const outDir = path.join(__dirname, '..', 'public', 'images');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const [key, val] of Object.entries(data)) {
    if (val && val.u && val.u.startsWith('data:image/')) {
      const match = val.u.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        let ext = match[1];
        if (ext === 'jpeg') ext = 'jpg';
        const buffer = Buffer.from(match[2], 'base64');
        const filename = `${key}.${ext}`;
        fs.writeFileSync(path.join(outDir, filename), buffer);
        console.log(`Saved ${filename} (${buffer.length} bytes)`);
      }
    }
  }
}

// Also copy any uploads if needed
const uploadsDir = path.join(__dirname, '..', 'Pre-membership website pages', 'uploads');
if (fs.existsSync(uploadsDir)) {
  const outUploads = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(outUploads)) fs.mkdirSync(outUploads, { recursive: true });
  for (const file of fs.readdirSync(uploadsDir)) {
    fs.copyFileSync(path.join(uploadsDir, file), path.join(outUploads, file));
    console.log(`Copied upload: ${file}`);
  }
}
