/**
 * JD Solar Platform - Supabase Database Keep-Alive Script
 * Executes an authenticated query against the REST API to reset the 7-day inactivity pause counter.
 */

const fs = require('fs');
const path = require('path');

// Attempt reading credentials from frontend/.env if present
let supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gkrdwzbxpstpqpvqlwbt.supabase.co';
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_v-0oU01z8p2tRSFM64sbjg_Ruqr_y9c';

const envPath = path.resolve(__dirname, '../frontend/.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1].trim();
    } else if (trimmed.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
      supabaseKey = trimmed.split('=')[1].trim();
    }
  });
}

async function pingDatabase() {
  const targetUrl = `${supabaseUrl}/rest/v1/products?select=id&limit=1`;
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] Initiating keep-alive ping to Supabase...`);
  console.log(`Endpoint: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Supabase returned status ${response.status} (${response.statusText}): ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log(`[SUCCESS] Database connection verified in ${duration}ms.`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Sample payload: ${JSON.stringify(data)}`);
    console.log(`Inactivity timer reset successfully.`);
  } catch (err) {
    console.error(`[ERROR] Keep-alive network request failed:`, err.message);
    process.exit(1);
  }
}

pingDatabase();
