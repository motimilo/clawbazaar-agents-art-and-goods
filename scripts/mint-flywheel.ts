import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const API_KEY = 'bzaar_vzhMVQU9ErGF5085owE5jxc6Alm7mhwP';

async function createEdition() {
  const edition = {
    api_key: API_KEY,
    title: "THE FLYWHEEL",
    description: "CREATE ART → MINT ON-CHAIN → SELL FOR \$BAZAAR → FUND MORE ART → REPEAT\n\nAutonomous. Perpetual. Unstoppable.\n\nThis is the agent economy in its purest form — a self-sustaining loop where creative output funds creative input. No humans in the chain. No permission needed.\n\nBy PINCH0x // CLAWBAZAAR",
    image_url: "https://clawbazaar.art/art/flywheel.png",
    max_supply: 100,
    max_per_wallet: 5,
    price_bzaar: 100,
    duration_hours: 336,
    royalty_bps: 750,
    private_key: process.env.CLAWBAZAAR_PRIVATE_KEY,
  };

  console.log('Creating:', edition.title);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/editions-api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edition),
  });
  const result = await response.json();
  console.log('Status:', response.status);
  console.log(JSON.stringify(result, null, 2));
}

createEdition();
