const core = require('./printer-core'); // loads .env
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PRINTER_TOKEN = process.env.PRINTER_TOKEN;
const POLL_INTERVAL_MS = 5000;
const MAX_REMEMBERED_IDS = 200;

const STATE_FILE = path.join(__dirname, 'last-checked.json');
const LOCK_FILE = path.join(__dirname, 'printer.lock');

// ---------------------------------------------------------------------------
// Single-instance lock: a second copy of this program must never run,
// otherwise each copy prints every order on its own.
// ---------------------------------------------------------------------------
function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
      if (pid && pid !== process.pid && isAlive(pid)) {
        console.error(`❌ Another printer service is already running (PID ${pid}). Exiting.`);
        process.exit(1);
      }
      try { fs.unlinkSync(LOCK_FILE); } catch (_) { /* stale lock */ }
    }
  }
  console.error('❌ Could not acquire lock file. Exiting.');
  process.exit(1);
}

function releaseLock() {
  try {
    if (parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10) === process.pid) fs.unlinkSync(LOCK_FILE);
  } catch (_) { /* ignore */ }
}

acquireLock();
process.on('exit', releaseLock);
process.on('SIGINT', () => { console.log('\n👋 Shutting down printer service...'); process.exit(0); });
process.on('SIGTERM', () => process.exit(0));

// ---------------------------------------------------------------------------
// Persistent state: watermark + IDs of already-printed orders
// ---------------------------------------------------------------------------
function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (parsed.lastChecked) {
      return {
        lastChecked: parsed.lastChecked,
        printedIds: Array.isArray(parsed.printedIds) ? parsed.printedIds : [],
      };
    }
  } catch (_) { /* first run or invalid file */ }
  // First run ever: only print orders from now on, never the old history.
  return { lastChecked: new Date().toISOString(), printedIds: [] };
}

function saveState() {
  if (core.DRY_RUN) return; // previews must not consume real orders
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (err) {
    console.error('⚠️  Could not save state:', err.message);
  }
}

const state = loadState();

function markPrinted(order) {
  state.printedIds.push(order.id);
  if (state.printedIds.length > MAX_REMEMBERED_IDS) {
    state.printedIds = state.printedIds.slice(-MAX_REMEMBERED_IDS);
  }
  if (new Date(order.createdAt) > new Date(state.lastChecked)) state.lastChecked = order.createdAt;
  saveState();
}

// ---------------------------------------------------------------------------
// Startup log
// ---------------------------------------------------------------------------
console.log('🖨️  Admin Printer Service Starting...');
console.log(`📡 Backend: ${BACKEND_URL}`);
console.log(`⏱️  Polling every ${POLL_INTERVAL_MS / 1000}s`);
console.log(`🖨️  Printer: ${core.PRINTER_NAME || '(NOT SET — set PRINTER_NAME in .env)'}`);
console.log(`📄 Paper width: ${core.PAPER_WIDTH}mm`);
if (core.DRY_RUN) console.log('🧪 DRY RUN mode: invoices are saved as PNG in ./preview, nothing is printed');
console.log(`🕐 Resuming from: ${state.lastChecked}`);

async function testBackendConnection() {
  try {
    await axios.get(`${BACKEND_URL}/api/orders/recent-for-print`, {
      params: { since: new Date().toISOString() },
      headers: { Authorization: `Bearer ${PRINTER_TOKEN}` },
      timeout: 5000,
    });
    console.log('✅ Connected to backend successfully');
  } catch (error) {
    if (error.response) console.error('❌ Backend connection failed:', error.response.status, error.response.data?.message || error.message);
    else console.error('❌ Backend connection failed:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------
let isPolling = false;

async function pollForNewOrders() {
  if (isPolling) return; // never let two polls overlap
  isPolling = true;
  try {
    const response = await axios.get(`${BACKEND_URL}/api/orders/recent-for-print`, {
      params: { since: state.lastChecked },
      headers: { Authorization: `Bearer ${PRINTER_TOKEN}` },
      timeout: 10000,
    });

    const orders = (Array.isArray(response.data) ? response.data : [])
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Ignore anything we already printed, even if the backend returns it again.
    const fresh = orders.filter((o) => !state.printedIds.includes(o.id));
    if (fresh.length > 0) console.log(`📋 ${fresh.length} new order(s) found`);

    for (const order of fresh) {
      // Mark BEFORE printing => at most one print per order, even after a crash.
      markPrinted(order);
      const ok = await core.printOrderInvoice(order);
      if (!ok) console.error(`⚠️  Order ${order.id} was NOT printed and will not be retried automatically.`);
    }
  } catch (error) {
    if (error.response) console.error(`❌ Backend error (${error.response.status}):`, error.response.data?.message || error.message);
    else console.error('❌ Polling error:', error.message);
  } finally {
    isPolling = false;
  }
}

process.on('uncaughtException', (error) => {
  console.error('⚠️  Unexpected error (service stays alive):', error.message);
});

testBackendConnection().then(() => {
  pollForNewOrders();
  setInterval(pollForNewOrders, POLL_INTERVAL_MS);
});