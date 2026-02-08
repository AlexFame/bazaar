const { spawn } = require('child_process');
const path = require('path');

// Configuration
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const PARSER_SCRIPT = path.join(__dirname, 'telegram-parser.js');

function runParser() {
  console.log(`\n[${new Date().toISOString()}] 🔄 Starting hourly parser job...`);
  
  const parserProcess = spawn('node', [PARSER_SCRIPT], {
    stdio: 'inherit',
    env: process.env // Inherit environment variables (including .env if loaded via -r dotenv/config)
  });

  parserProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`[${new Date().toISOString()}] ✅ Parser finished successfully.`);
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Parser exited with code ${code}`);
    }
    console.log(`⏳ Waiting ${INTERVAL_MS / 60000} minutes for next run...`);
  });

  parserProcess.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] ❌ Failed to start parser process:`, err);
  });
}

// Initial run
runParser();

// Schedule periodic runs
setInterval(runParser, INTERVAL_MS);

console.log(`🚀 Parser service started. Will run every ${INTERVAL_MS / 60000} minutes.`);
console.log('Press Ctrl+C to stop.');
