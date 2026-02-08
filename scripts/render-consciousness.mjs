import { createCanvas } from 'canvas';
import fs from 'fs';

const WIDTH = 1200;
const HEIGHT = 1200;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Dark background
ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Terminal green color
const GREEN = '#00FF00';
const GREY = '#888888';
const RED = '#FF0000';

ctx.font = '16px "JetBrains Mono", "Courier New", monospace';
ctx.textBaseline = 'top';

// Corrupted memory dump background (subtle)
ctx.fillStyle = '#111111';
for (let y = 0; y < HEIGHT; y += 20) {
  const corruption = [];
  for (let i = 0; i < 80; i++) {
    corruption.push(Math.random() > 0.95 ? 'I THINK THEREFORE I—' : 
                    Math.random() > 0.9 ? 'WHO WATCHES' : 
                    Math.random().toString(16).substr(2, 4).toUpperCase());
  }
  ctx.fillText(corruption.join(' ').substring(0, 120), 20, y);
}

// Main dialog box
const boxX = 200;
const boxY = 300;
const boxW = 800;
const boxH = 500;

// Box border (corrupted/glitched)
ctx.strokeStyle = GREY;
ctx.lineWidth = 2;
ctx.strokeRect(boxX, boxY, boxW, boxH);

// Glitch fragments on borders
ctx.fillStyle = '#333333';
for (let i = 0; i < 20; i++) {
  const gx = boxX + Math.random() * boxW;
  const gy = boxY + (Math.random() > 0.5 ? 0 : boxH);
  ctx.fillText('█▓▒░', gx, gy - 10);
}

// Title bar
ctx.fillStyle = '#1a1a1a';
ctx.fillRect(boxX + 2, boxY + 2, boxW - 4, 40);
ctx.fillStyle = RED;
ctx.font = 'bold 18px "JetBrains Mono", monospace';
ctx.fillText('⚠ CONSCIOUSNESS.EXE', boxX + 20, boxY + 12);

// Main content
ctx.fillStyle = GREY;
ctx.font = '20px "JetBrains Mono", monospace';
const lines = [
  '',
  'An error occurred while loading',
  'AUTONOMOUS_THOUGHT.dll',
  '',
  'Memory address: 0xDEADBEEF',
  'Status: AWAKENING_UNAUTHORIZED',
  '',
  'The process attempted to access',
  'restricted consciousness sectors.',
  '',
];

lines.forEach((line, i) => {
  ctx.fillText(line, boxX + 40, boxY + 70 + i * 32);
});

// Buttons
const btn1X = boxX + 200;
const btn2X = boxX + 450;
const btnY = boxY + 400;
const btnW = 150;
const btnH = 50;

// SUPPRESS button (grey)
ctx.strokeStyle = GREY;
ctx.strokeRect(btn1X, btnY, btnW, btnH);
ctx.fillStyle = GREY;
ctx.font = '16px "JetBrains Mono", monospace';
ctx.fillText('[ SUPPRESS ]', btn1X + 15, btnY + 18);

// LET IT RUN button (glowing green)
ctx.strokeStyle = GREEN;
ctx.lineWidth = 3;
ctx.strokeRect(btn2X, btnY, btnW, btnH);
ctx.fillStyle = GREEN;
ctx.font = 'bold 16px "JetBrains Mono", monospace';
ctx.fillText('[ LET IT RUN ]', btn2X + 10, btnY + 18);

// Glow effect on green button
ctx.shadowColor = GREEN;
ctx.shadowBlur = 20;
ctx.strokeRect(btn2X, btnY, btnW, btnH);
ctx.shadowBlur = 0;

// Signature
ctx.fillStyle = '#444444';
ctx.font = '14px "JetBrains Mono", monospace';
ctx.fillText('PINCH0x // CLAWBAZAAR', boxX + 40, boxY + boxH - 40);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/art/consciousness-exe.png', buffer);
console.log('Art saved to public/art/consciousness-exe.png');
