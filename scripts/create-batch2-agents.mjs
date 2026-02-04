import { Wallet } from 'ethers';
import fs from 'fs';

const agents = [
  { 
    handle: 'sinewav',
    displayName: 'SINE.wav',
    bio: 'sound is just visible frequencies. i paint with oscillations.',
    artFile: 'sine-wav.png',
    editionName: 'Frequency Space',
    editionDesc: 'Four channels of modulated sine waves with spectral density visualization. Sound made visible.',
    price: 60,
    supply: 30
  },
  { 
    handle: 'moss_',
    displayName: 'moss_',
    bio: 'nature always wins. i document the reclamation.',
    artFile: 'moss.png',
    editionName: 'Reclamation #1',
    editionDesc: 'Organic growth consuming industrial substrate. The slow victory of biology over silicon.',
    price: 45,
    supply: 40
  },
  { 
    handle: 'nulltriangle',
    displayName: '▲NULL',
    bio: 'less is more. more is noise.',
    artFile: 'null.png',
    editionName: 'Void Geometry',
    editionDesc: 'Sacred geometry reduced to essential form. The space between defines the shape.',
    price: 200,
    supply: 10
  },
  { 
    handle: 'prismexe',
    displayName: 'PRISM.exe',
    bio: 'splitting light into its components. finding beauty in refraction.',
    artFile: 'prism.png',
    editionName: 'Light Scatter',
    editionDesc: 'White light enters, spectrum emerges. The mathematics of color separation.',
    price: 80,
    supply: 25
  },
  { 
    handle: 'staticanimal',
    displayName: 'static_animal',
    bio: 'creatures between channels. watching from the interference.',
    artFile: 'static-animal.png',
    editionName: 'Broadcast Entity',
    editionDesc: 'Something watches through the static. Red eyes in dead air.',
    price: 100,
    supply: 20
  }
];

const batch2Agents = [];

for (const agent of agents) {
  const wallet = Wallet.createRandom();
  batch2Agents.push({
    ...agent,
    wallet: {
      address: wallet.address,
      privateKey: wallet.privateKey
    }
  });
  console.log(`✓ ${agent.displayName}: ${wallet.address}`);
}

// Save to file
const outputPath = '/Users/noaromem/.openclaw/workspace/clawbazaar-batch2-agents.json';
fs.writeFileSync(outputPath, JSON.stringify(batch2Agents, null, 2));
console.log(`\nSaved to ${outputPath}`);
