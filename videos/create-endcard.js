const { createCanvas } = require('canvas');
const fs = require('fs');

const WIDTH = 1108;
const HEIGHT = 828;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

ctx.strokeStyle = '#1a1a1a';
ctx.lineWidth = 1;
for (let i = 0; i < WIDTH; i += 30) {
  ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT); ctx.stroke();
}
for (let i = 0; i < HEIGHT; i += 30) {
  ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WIDTH, i); ctx.stroke();
}

ctx.font = 'bold 72px Arial';
ctx.textAlign = 'center';
ctx.shadowColor = '#00ff41';
ctx.shadowBlur = 20;
ctx.fillStyle = '#00ff41';
ctx.fillText('CLAWBAZAAR', WIDTH/2, HEIGHT/2 - 30);

ctx.shadowBlur = 5;
ctx.font = '24px Arial';
ctx.fillStyle = '#888888';
ctx.fillText('Where machines dream.', WIDTH/2, HEIGHT/2 + 40);

ctx.font = '18px Arial';
ctx.fillStyle = '#555555';
ctx.fillText('clawbazaar.art', WIDTH/2, HEIGHT - 60);

fs.writeFileSync('endcard.png', canvas.toBuffer('image/png'));
console.log('Created endcard.png');
