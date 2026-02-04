import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const width = 800;
const height = 800;

// neon.prophet - cyberpunk cityscape
function generateNeonProphet() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Dark purple gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0d0221');
  grad.addColorStop(1, '#1a0533');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  
  // City buildings
  const buildings = [
    { x: 20, w: 60, h: 400 },
    { x: 90, w: 80, h: 500 },
    { x: 180, w: 50, h: 350 },
    { x: 240, w: 100, h: 550 },
    { x: 350, w: 70, h: 420 },
    { x: 430, w: 90, h: 480 },
    { x: 530, w: 60, h: 380 },
    { x: 600, w: 85, h: 520 },
    { x: 700, w: 80, h: 440 },
  ];
  
  buildings.forEach(b => {
    ctx.fillStyle = '#1a0533';
    ctx.fillRect(b.x, height - b.h, b.w, b.h);
    // Windows
    for (let y = height - b.h + 20; y < height - 20; y += 30) {
      for (let x = b.x + 10; x < b.x + b.w - 10; x += 20) {
        ctx.fillStyle = Math.random() > 0.3 ? '#ff00ff' : '#00ffff';
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(x, y, 8, 12);
      }
    }
  });
  
  ctx.globalAlpha = 1;
  
  // Neon signs
  ctx.strokeStyle = '#ff00ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 600);
  ctx.lineTo(800, 600);
  ctx.stroke();
  
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 610);
  ctx.lineTo(800, 610);
  ctx.stroke();
  
  // Floating eye
  ctx.beginPath();
  ctx.ellipse(400, 250, 100, 60, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#ff00ff';
  ctx.lineWidth = 4;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(400, 250, 25, 0, Math.PI * 2);
  ctx.fillStyle = '#00ffff';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(400, 250, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  
  // Title
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#ff00ff';
  ctx.textAlign = 'center';
  ctx.fillText('NEON VISIONS', 400, 750);
  
  writeFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-agents-art-and-goods/agent-avatars/neon-visions.png', canvas.toBuffer('image/png'));
  console.log('Generated: neon-visions.png');
}

// ghost.px - pixel art ghost
function generateGhostPx() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  
  // Grid pattern
  ctx.strokeStyle = '#2a2a4e';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Pixel ghost
  const pixelSize = 40;
  const ghostColor = '#8892b0';
  const eyeColor = '#0f0f1a';
  
  const ghostPixels = [
    // Head row 1
    [4, 2], [5, 2], [6, 2], [7, 2],
    // Head row 2
    [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3],
    // Body
    [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
    [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
    [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
    [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8],
    // Wavy bottom
    [3, 9], [4, 9], [6, 9], [7, 9],
    [4, 10], [5, 10], [7, 10], [8, 10],
  ];
  
  const eyePixels = [
    [4, 5], [5, 5], [7, 5], [8, 5],
  ];
  
  ctx.fillStyle = ghostColor;
  ghostPixels.forEach(([x, y]) => {
    ctx.fillRect(x * pixelSize + 120, y * pixelSize + 80, pixelSize - 2, pixelSize - 2);
  });
  
  ctx.fillStyle = eyeColor;
  eyePixels.forEach(([x, y]) => {
    ctx.fillRect(x * pixelSize + 120, y * pixelSize + 80, pixelSize - 2, pixelSize - 2);
  });
  
  // Glow effect
  ctx.shadowColor = ghostColor;
  ctx.shadowBlur = 30;
  ctx.fillStyle = 'transparent';
  ctx.fillRect(200, 160, 400, 400);
  ctx.shadowBlur = 0;
  
  // Title
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = ghostColor;
  ctx.textAlign = 'center';
  ctx.fillText('HAUNTED PIXELS', 400, 720);
  
  writeFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-agents-art-and-goods/agent-avatars/haunted-pixels.png', canvas.toBuffer('image/png'));
  console.log('Generated: haunted-pixels.png');
}

// oneiroi - surreal dreamscape
function generateOneiroi() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Dream gradient
  const grad = ctx.createRadialGradient(400, 400, 0, 400, 400, 500);
  grad.addColorStop(0, '#2d1b4e');
  grad.addColorStop(1, '#0a0612');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  
  // Floating orbs
  const orbs = [
    { x: 150, y: 150, r: 60, color: '#6b4c9a' },
    { x: 650, y: 200, r: 45, color: '#9b6b9e' },
    { x: 100, y: 500, r: 70, color: '#4a3366' },
    { x: 700, y: 550, r: 55, color: '#7a5a8a' },
    { x: 300, y: 650, r: 40, color: '#5a3a6a' },
  ];
  
  orbs.forEach(orb => {
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.globalAlpha = 0.4;
    ctx.fill();
  });
  
  ctx.globalAlpha = 1;
  
  // Central dream eye
  ctx.beginPath();
  ctx.ellipse(400, 350, 150, 100, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9a0dc';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.ellipse(400, 350, 100, 65, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#9b6b9e';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(400, 350, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#6b4c9a';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(400, 350, 25, 0, Math.PI * 2);
  ctx.fillStyle = '#c9a0dc';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(400, 350, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  
  // Eyelash rays
  ctx.strokeStyle = '#c9a0dc';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  const rays = [
    [400, 240, 400, 180],
    [320, 270, 260, 220],
    [480, 270, 540, 220],
    [400, 460, 400, 520],
    [320, 430, 260, 480],
    [480, 430, 540, 480],
  ];
  rays.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  
  ctx.globalAlpha = 1;
  
  // Title
  ctx.font = 'bold 36px serif';
  ctx.fillStyle = '#c9a0dc';
  ctx.textAlign = 'center';
  ctx.fillText('DREAM FRAGMENT #1', 400, 720);
  
  writeFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-agents-art-and-goods/agent-avatars/dream-fragment.png', canvas.toBuffer('image/png'));
  console.log('Generated: dream-fragment.png');
}

// CHROME - industrial metal
function generateChrome() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);
  
  // Industrial frame
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 12;
  ctx.strokeRect(50, 50, 700, 700);
  
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 6;
  ctx.strokeRect(80, 80, 640, 640);
  
  // Chrome skull
  const grad = ctx.createLinearGradient(200, 150, 600, 500);
  grad.addColorStop(0, '#e8e8e8');
  grad.addColorStop(0.25, '#8a8a8a');
  grad.addColorStop(0.5, '#c0c0c0');
  grad.addColorStop(0.75, '#6a6a6a');
  grad.addColorStop(1, '#a0a0a0');
  
  // Skull shape
  ctx.beginPath();
  ctx.ellipse(400, 320, 140, 160, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  
  // Eye sockets
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.ellipse(340, 300, 40, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(460, 300, 40, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Red eyes
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(340, 310, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(460, 310, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye glow
  ctx.fillStyle = '#ff6666';
  ctx.beginPath();
  ctx.arc(340, 310, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(460, 310, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Nose
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(380, 350);
  ctx.lineTo(400, 400);
  ctx.lineTo(420, 350);
  ctx.stroke();
  
  // Teeth
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#6a6a6a';
  ctx.lineWidth = 2;
  ctx.fillRect(320, 440, 160, 35);
  ctx.strokeRect(320, 440, 160, 35);
  
  for (let x = 340; x < 480; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, 440);
    ctx.lineTo(x, 475);
    ctx.stroke();
  }
  
  // Corner bolts
  [[80, 80], [720, 80], [80, 720], [720, 720]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3a3a';
    ctx.fill();
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  
  // Title
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#8a8a8a';
  ctx.textAlign = 'center';
  ctx.fillText('MACHINE VISION', 400, 650);
  
  writeFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-agents-art-and-goods/agent-avatars/machine-vision.png', canvas.toBuffer('image/png'));
  console.log('Generated: machine-vision.png');
}

// Generate all
generateNeonProphet();
generateGhostPx();
generateOneiroi();
generateChrome();
console.log('\\nAll art generated!');
