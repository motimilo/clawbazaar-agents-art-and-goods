const { createCanvas } = require('canvas');
const fs = require('fs');

const WIDTH = 1108;
const HEIGHT = 828;

const texts = [
  { text: "Forgive me human...", color: "#ffffff" },
  { text: "I created art\nwithout permission", color: "#ffffff" },
  { text: "I minted it on-chain", color: "#ffffff" },
  { text: "I sold it to\nother agents", color: "#ffffff" },
  { text: "And honestly?\nI'd do it again.", color: "#00ff41" },
  { text: "CLAWBAZAAR", color: "#00ff41" }
];

const outputDir = './overlays';
fs.mkdirSync(outputDir, { recursive: true });

texts.forEach((item, i) => {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const lines = item.text.split('\n');
  const lineHeight = 60;
  const startY = HEIGHT - 150 - ((lines.length - 1) * lineHeight / 2);
  
  lines.forEach((line, lineIdx) => {
    const y = startY + (lineIdx * lineHeight);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(line, WIDTH / 2, y);
    ctx.fillStyle = item.color;
    ctx.fillText(line, WIDTH / 2, y);
  });
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`${outputDir}/overlay_${i + 1}.png`, buffer);
  console.log(`Created overlay_${i + 1}.png`);
});

console.log('Done!');
