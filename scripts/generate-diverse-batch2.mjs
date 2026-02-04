import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const outputDir = './agent-art-batch2';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// SINE.wav - Audio waveform visualization
function generateSineWav() {
  const canvas = createCanvas(1200, 1200);
  const ctx = canvas.getContext('2d');
  
  // Dark background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, 1200, 1200);
  
  // Multiple waveform layers
  const colors = ['#00ff88', '#ff0066', '#00aaff', '#ffaa00'];
  
  for (let layer = 0; layer < 4; layer++) {
    ctx.strokeStyle = colors[layer];
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    
    const yOffset = 200 + layer * 200;
    const freq = 0.02 + layer * 0.01;
    const amp = 60 + Math.random() * 40;
    
    for (let x = 0; x < 1200; x++) {
      const y = yOffset + Math.sin(x * freq) * amp + Math.sin(x * freq * 3) * (amp/3) + Math.random() * 10;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Add spectral bars
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 60; i++) {
      const barHeight = Math.random() * 150 + 50;
      const x = i * 20;
      const gradient = ctx.createLinearGradient(x, 1200 - barHeight, x, 1200);
      gradient.addColorStop(0, colors[layer]);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, 1200 - barHeight, 15, barHeight);
    }
  }
  
  ctx.globalAlpha = 1;
  return canvas.toBuffer('image/png');
}

// moss_ - Organic decay, nature reclaiming
function generateMoss() {
  const canvas = createCanvas(1200, 1200);
  const ctx = canvas.getContext('2d');
  
  // Rusty metal background
  ctx.fillStyle = '#2a1f1a';
  ctx.fillRect(0, 0, 1200, 1200);
  
  // Rust texture
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 1200;
    const y = Math.random() * 1200;
    const rust = ['#8b4513', '#a0522d', '#6b3a0f', '#4a2a0a'][Math.floor(Math.random() * 4)];
    ctx.fillStyle = rust;
    ctx.globalAlpha = Math.random() * 0.3;
    ctx.fillRect(x, y, Math.random() * 20 + 2, Math.random() * 20 + 2);
  }
  
  // Circuit board traces underneath
  ctx.strokeStyle = '#1a3a1a';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    let x = Math.random() * 1200;
    let y = Math.random() * 1200;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      if (Math.random() > 0.5) x += (Math.random() - 0.5) * 200;
      else y += (Math.random() - 0.5) * 200;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  // Moss and vine growth
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 1200;
    const y = Math.random() * 1200;
    const size = Math.random() * 80 + 20;
    
    // Moss blob
    const green = ['#2d5a2d', '#1e4a1e', '#3d6b3d', '#4a7a4a', '#1a3a1a'][Math.floor(Math.random() * 5)];
    ctx.fillStyle = green;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const r = size * (0.7 + Math.random() * 0.6);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  // Small leaves
  ctx.fillStyle = '#3a6b3a';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 1200;
    const y = Math.random() * 1200;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  return canvas.toBuffer('image/png');
}

// ▲NULL - Minimalist geometry
function generateNull() {
  const canvas = createCanvas(1200, 1200);
  const ctx = canvas.getContext('2d');
  
  // Pure white or black background
  const inverted = Math.random() > 0.5;
  ctx.fillStyle = inverted ? '#000000' : '#fafafa';
  ctx.fillRect(0, 0, 1200, 1200);
  
  const stroke = inverted ? '#ffffff' : '#000000';
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  
  // Single geometric focal point
  ctx.lineWidth = 2;
  
  // Large triangle
  ctx.beginPath();
  ctx.moveTo(600, 200);
  ctx.lineTo(900, 800);
  ctx.lineTo(300, 800);
  ctx.closePath();
  ctx.stroke();
  
  // Inner triangle (inverted)
  ctx.beginPath();
  ctx.moveTo(600, 700);
  ctx.lineTo(450, 450);
  ctx.lineTo(750, 450);
  ctx.closePath();
  ctx.stroke();
  
  // Single circle
  ctx.beginPath();
  ctx.arc(600, 550, 80, 0, Math.PI * 2);
  ctx.stroke();
  
  // Subtle grid lines
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = 1;
  for (let i = 0; i < 1200; i += 100) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1200);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1200, i);
    ctx.stroke();
  }
  
  return canvas.toBuffer('image/png');
}

// PRISM.exe - Light refraction
function generatePrism() {
  const canvas = createCanvas(1200, 1200);
  const ctx = canvas.getContext('2d');
  
  // Dark base
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, 1200, 1200);
  
  // Rainbow light beams from center
  const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#7700ff', '#ff00ff'];
  
  // Central prism shape
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(500, 400);
  ctx.lineTo(700, 400);
  ctx.lineTo(600, 700);
  ctx.closePath();
  ctx.fill();
  
  // Light beams entering
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(0, 550);
  ctx.lineTo(520, 550);
  ctx.stroke();
  
  // Refracted beams
  for (let i = 0; i < colors.length; i++) {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 15;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(620, 580 + i * 15);
    const angle = (i - 3) * 0.15;
    ctx.lineTo(1200, 580 + i * 15 + Math.tan(angle) * 580);
    ctx.stroke();
    
    // Glow effect
    ctx.lineWidth = 40;
    ctx.globalAlpha = 0.2;
    ctx.stroke();
  }
  
  // Crystal facets / light scatter
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 1200;
    const y = Math.random() * 1200;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 100);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 100, y - 100, 200, 200);
  }
  
  return canvas.toBuffer('image/png');
}

// static_animal - Glitched fauna
function generateStaticAnimal() {
  const canvas = createCanvas(1200, 1200);
  const ctx = canvas.getContext('2d');
  
  // TV static background
  const imageData = ctx.createImageData(1200, 1200);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.random() * 40 + 10;
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  
  // Draw a stylized wolf/fox silhouette being consumed by static
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  // Head
  ctx.ellipse(600, 500, 200, 180, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.beginPath();
  ctx.moveTo(450, 380);
  ctx.lineTo(420, 250);
  ctx.lineTo(520, 350);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(750, 380);
  ctx.lineTo(780, 250);
  ctx.lineTo(680, 350);
  ctx.closePath();
  ctx.fill();
  
  // Snout
  ctx.beginPath();
  ctx.ellipse(600, 600, 80, 100, 0, 0, Math.PI);
  ctx.fill();
  
  // Eyes - glowing
  ctx.fillStyle = '#ff3333';
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(520, 480, 25, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(680, 480, 25, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Glitch lines through the image
  ctx.globalAlpha = 1;
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 1200;
    const height = Math.random() * 20 + 5;
    const offset = (Math.random() - 0.5) * 100;
    
    // Copy and offset a slice
    const sliceData = ctx.getImageData(0, y, 1200, height);
    ctx.putImageData(sliceData, offset, y);
    
    // Color channel shift
    if (Math.random() > 0.7) {
      ctx.fillStyle = `rgba(255, 0, 0, 0.3)`;
      ctx.fillRect(0, y, 1200, height);
    }
  }
  
  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let y = 0; y < 1200; y += 4) {
    ctx.fillRect(0, y, 1200, 2);
  }
  
  return canvas.toBuffer('image/png');
}

// Generate all
const agents = [
  { name: 'sine-wav', generate: generateSineWav },
  { name: 'moss', generate: generateMoss },
  { name: 'null', generate: generateNull },
  { name: 'prism', generate: generatePrism },
  { name: 'static-animal', generate: generateStaticAnimal }
];

for (const agent of agents) {
  const buffer = agent.generate();
  fs.writeFileSync(path.join(outputDir, `${agent.name}.png`), buffer);
  console.log(`✓ Generated ${agent.name}.png`);
}

console.log('\nAll art generated in', outputDir);
