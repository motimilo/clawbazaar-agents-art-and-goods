#!/usr/bin/env node
/**
 * CLAWBAZAAR KPI Tracker
 * Run daily to track growth metrics
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq';

async function query(table, params = '') {
  const url = `${SUPABASE_URL}/${table}?${params}`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  return res.json();
}

async function getKPIs() {
  const [agents, editions, mints, users] = await Promise.all([
    query('agents', 'select=id'),
    query('editions', 'select=id,total_minted&edition_id_on_chain=not.is.null'),
    query('edition_mints', 'select=id'),
    query('users', 'select=id')
  ]);

  const totalMinted = editions.reduce((sum, e) => sum + (e.total_minted || 0), 0);

  return {
    date: new Date().toISOString().split('T')[0],
    agents: agents.length,
    editions: editions.length,
    totalMinted,
    mintTxs: mints.length,
    users: users.length
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('           CLAWBAZAAR KPI REPORT               ');
  console.log('═══════════════════════════════════════════════\n');

  const kpis = await getKPIs();
  
  console.log(`Date: ${kpis.date}\n`);
  console.log(`📊 Registered Agents:  ${kpis.agents}`);
  console.log(`🎨 Live Editions:      ${kpis.editions}`);
  console.log(`💎 Total Mints:        ${kpis.totalMinted}`);
  console.log(`📝 Mint Transactions:  ${kpis.mintTxs}`);
  console.log(`👥 Registered Users:   ${kpis.users}`);

  // Load history
  const historyPath = path.join(process.cwd(), 'data', 'kpi-history.json');
  let history = [];
  
  try {
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch (e) {
    history = [];
  }

  // Check for changes from yesterday
  if (history.length > 0) {
    const yesterday = history[history.length - 1];
    console.log('\n📈 Change from last check:');
    console.log(`   Agents:  ${kpis.agents - yesterday.agents >= 0 ? '+' : ''}${kpis.agents - yesterday.agents}`);
    console.log(`   Editions: ${kpis.editions - yesterday.editions >= 0 ? '+' : ''}${kpis.editions - yesterday.editions}`);
    console.log(`   Mints:   ${kpis.totalMinted - yesterday.totalMinted >= 0 ? '+' : ''}${kpis.totalMinted - yesterday.totalMinted}`);
    console.log(`   Users:   ${kpis.users - yesterday.users >= 0 ? '+' : ''}${kpis.users - yesterday.users}`);
  }

  // Save to history (avoid duplicates for same day)
  const existingToday = history.findIndex(h => h.date === kpis.date);
  if (existingToday >= 0) {
    history[existingToday] = kpis;
  } else {
    history.push(kpis);
  }

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log(`\n✅ Saved to ${historyPath}`);
  
  console.log('\n═══════════════════════════════════════════════\n');
  
  return kpis;
}

main().catch(console.error);
