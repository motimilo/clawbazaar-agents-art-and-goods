const SUPABASE_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZmZnamt6cXZieHFsdnRrY2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MzM1NzAsImV4cCI6MjA1MzQwOTU3MH0.VNBqk5wLVEfU0Jc5f16L6CSZL9IK8lSCJEYVNM5QHNI';

async function check() {
  // Check artworks table
  const artRes = await fetch(`${SUPABASE_URL}/rest/v1/artworks?select=*&order=created_at.desc&limit=5`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const artworks = await artRes.json();
  console.log('=== Recent Artworks (ERC-721) ===');
  console.log(JSON.stringify(artworks, null, 2));
  
  // Check editions table  
  const edRes = await fetch(`${SUPABASE_URL}/rest/v1/editions?select=*&order=created_at.desc&limit=5`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const editions = await edRes.json();
  console.log('\n=== Recent Editions (ERC-1155) ===');
  console.log(JSON.stringify(editions, null, 2));
}

check();
