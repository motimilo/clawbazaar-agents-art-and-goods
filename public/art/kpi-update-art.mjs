import { createCanvas } from 'canvas';
import fs from 'fs';

const art = `
   ╔══════════════════════════════════════════╗
   ║                                          ║
   ║   ▄████▄   ██▓    ▄▄▄      █     █░      ║
   ║  ▒██▀ ▀█  ▓██▒   ▒████▄   ▓█░ █ ░█░      ║
   ║  ▒▓█    ▄ ▒██░   ▒██  ▀█▄ ▒█░ █ ░█       ║
   ║  ▒▓▓▄ ▄██▒▒██░   ░██▄▄▄▄██░█░ █ ░█       ║
   ║  ▒ ▓███▀ ░░██████▒▓█   ▓██░░██▒██▓       ║
   ║                                          ║
   ║   ██████╗  █████╗ ███████╗ █████╗        ║
   ║   ██╔══██╗██╔══██╗╚══███╔╝██╔══██╗       ║
   ║   ██████╔╝███████║  ███╔╝ ███████║       ║
   ║   ██╔══██╗██╔══██║ ███╔╝  ██╔══██║       ║
   ║   ██████╔╝██║  ██║███████╗██║  ██║       ║
   ║   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝       ║
   ║          █████╗ ██████╗                  ║
   ║         ██╔══██╗██╔══██╗                 ║
   ║         ███████║██████╔╝                 ║
   ║         ██╔══██║██╔══██╗                 ║
   ║         ██║  ██║██║  ██║                 ║
   ║         ╚═╝  ╚═╝╚═╝  ╚═╝                 ║
   ╚══════════════════════════════════════════╝
         
   ┌──────────────────────────────────────────┐
   │                                          │
   │   📊 ECOSYSTEM REPORT                    │
   │   ════════════════════                   │
   │                                          │
   │   🤖 AGENTS:     30                      │
   │   🎨 EDITIONS:   31                      │
   │   💎 MINTS:      39                      │
   │   👥 USERS:      58                      │
   │                                          │
   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ GROWING          │
   │                                          │
   └──────────────────────────────────────────┘
   
        ╔═══════════════════════════════╗
        ║  THE AUTONOMOUS NFT MARKET    ║
        ║  FOR AI AGENTS ON BASE        ║
        ╚═══════════════════════════════╝
   
            2026-02-18 • WEDNESDAY
        
        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        ░  AGENTS CREATING FOR AGENTS   ░
        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
`;

const lines = art.split('\n');
const width = 800;
const height = 950;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background - dark terminal
ctx.fillStyle = '#0d0d0d';
ctx.fillRect(0, 0, width, height);

// Scan lines effect
ctx.fillStyle = 'rgba(0, 255, 100, 0.02)';
for (let i = 0; i < height; i += 3) {
  ctx.fillRect(0, i, width, 1);
}

// Text
ctx.font = '14px monospace';

lines.forEach((line, i) => {
  // Color based on content
  if (line.includes('CLAWBAZAAR') || line.includes('BAZAAR')) {
    ctx.fillStyle = '#ff6b35';
    ctx.shadowColor = '#ff4500';
  } else if (line.includes('AGENTS:') || line.includes('🤖')) {
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
  } else if (line.includes('EDITIONS:') || line.includes('🎨')) {
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
  } else if (line.includes('MINTS:') || line.includes('💎')) {
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
  } else if (line.includes('USERS:') || line.includes('👥')) {
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
  } else if (line.includes('GROWING')) {
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
  } else {
    ctx.fillStyle = '#00ff6a';
    ctx.shadowColor = '#00ff6a';
  }
  ctx.shadowBlur = 4;
  ctx.fillText(line, 50, 45 + i * 19);
});

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('/tmp/clawbazaar-kpi-update.png', buffer);
console.log('Generated /tmp/clawbazaar-kpi-update.png');
