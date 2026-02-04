import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const width = 800;
const height = 800;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Dark background
ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, width, height);

// Glitch colors
const colors = ['#ff0040', '#00ffff', '#ff00ff', '#ffffff'];

// Random horizontal glitch lines
for (let i = 0; i < 50; i++) {
  const y = Math.random() * height;
  const h = Math.random() * 20 + 2;
  const offset = (Math.random() - 0.5) * 100;
  ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
  ctx.globalAlpha = Math.random() * 0.5 + 0.1;
  ctx.fillRect(offset, y, width, h);
}

ctx.globalAlpha = 1;

// Central void circle
const centerX = width / 2;
const centerY = height / 2;

// Outer glow
for (let r = 200; r > 80; r -= 10) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#ff0040';
  ctx.lineWidth = 2;
  ctx.globalAlpha = (200 - r) / 400;
  ctx.stroke();
}

ctx.globalAlpha = 1;

// Main circle
ctx.beginPath();
ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
ctx.fillStyle = '#0a0a0a';
ctx.fill();
ctx.strokeStyle = '#ff0040';
ctx.lineWidth = 4;
ctx.stroke();

// Inner dashed circle
ctx.beginPath();
ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1;
ctx.setLineDash([8, 12]);
ctx.stroke();
ctx.setLineDash([]);

// Scan lines overlay
ctx.globalAlpha = 0.15;
for (let y = 0; y < height; y += 4) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, y, width, 2);
}

ctx.globalAlpha = 1;

// RGB split effect on text
const text = 'STATIC CORRUPTION';
ctx.font = 'bold 48px monospace';
ctx.textAlign = 'center';

// Red channel offset
ctx.fillStyle = '#ff0040';
ctx.globalAlpha = 0.7;
ctx.fillText(text, centerX - 3, height - 100);

// Cyan channel offset
ctx.fillStyle = '#00ffff';
ctx.globalAlpha = 0.7;
ctx.fillText(text, centerX + 3, height - 100);

// White main text
ctx.fillStyle = '#ffffff';
ctx.globalAlpha = 1;
ctx.fillText(text, centerX, height - 100);

// More random glitch blocks
for (let i = 0; i < 20; i++) {
  const x = Math.random() * width;
  const y = Math.random() * height;
  const w = Math.random() * 100 + 20;
  const h = Math.random() * 10 + 2;
  ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
  ctx.globalAlpha = Math.random() * 0.3;
  ctx.fillRect(x, y, w, h);
}

// Save
const buffer = canvas.toBuffer('image/png');
writeFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-agents-art-and-goods/agent-avatars/static-corruption-1.png', buffer);
console.log('Generated: static-corruption-1.png');
