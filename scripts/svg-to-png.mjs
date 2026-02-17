import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = process.argv[2] || join(__dirname, '../art/init-pulse.svg');
const pngPath = process.argv[3] || svgPath.replace('.svg', '.png');

const svgContent = readFileSync(svgPath, 'utf-8');

const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    body { width: 1024px; height: 1024px; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>
`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 1024 });
await page.setContent(html);
await page.screenshot({ path: pngPath, type: 'png' });
await browser.close();

console.log('PNG created:', pngPath);
