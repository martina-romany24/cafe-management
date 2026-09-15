require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PRINTER_TOKEN = process.env.PRINTER_TOKEN;
const POLL_INTERVAL_MS = 5000; // check for new orders every 5 seconds

// Where we remember the last time we successfully checked for orders, so a
// restart doesn't reprint old invoices or miss ones that arrived while the
// service was down.
const STATE_FILE = path.join(__dirname, 'last-checked.json');

console.log('🖨️  Admin Printer Service Starting...');
console.log(`📡 Backend: ${BACKEND_URL}`);
console.log(`⏱️  Polling every ${POLL_INTERVAL_MS / 1000}s for new orders`);

function loadLastChecked() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.lastChecked) return parsed.lastChecked;
  } catch (err) {
    // File doesn't exist yet or is invalid — that's fine on first run.
  }
  // First run ever: only print orders from now on, not the entire history.
  return new Date().toISOString();
}

function saveLastChecked(isoString) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastChecked: isoString }));
  } catch (err) {
    console.error('⚠️  Could not save polling state:', err.message);
  }
}

let lastChecked = loadLastChecked();
console.log(`🕐 Resuming from: ${lastChecked}`);

// Creates a fresh connection to the printer only when we're about to print.
// If the printer is unplugged, this fails gracefully and the service keeps
// polling — it will succeed automatically once the printer is reconnected.
function createPrinterDevice() {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'printer:auto', // Auto-detect printer
      driver: require('node-thermal-printer').driver
    });
    return printer;
  } catch (error) {
    console.error('⚠️  Printer not found or not connected:', error.message);
    return null;
  }
}

function printOrderInvoice(order) {
  return new Promise(async (resolve) => {
    const printer = createPrinterDevice();
    if (!printer) {
      console.error(`❌ Could not print order #${order.id}: printer not connected.`);
      return resolve();
    }

    try {
      printer.alignCenter();
      printer.println('================================');
      printer.setTextSize('Large');
      printer.println('فاتورة');
      printer.setTextSize('Medium');
      printer.println('================================');
      printer.println('');
      printer.alignLeft();
      printer.println(`رقم الطلب: #${order.id}`);
      printer.println(`التاريخ: ${new Date(order.createdAt).toLocaleString('ar-EG')}`);
      printer.println(`الفرع: ${order.branch?.name || 'الإدارة'}`);
      printer.println('');
      printer.println('--------------------------------');
      printer.println('المنتجات:');
      printer.println('--------------------------------');
      printer.println('');

      order.items?.forEach((item, index) => {
        const productName = item.product?.name || 'منتج غير معروف';
        const quantity = item.quantity;
        const price = Number(item.priceAtSale).toFixed(2);
        const total = (Number(item.priceAtSale) * quantity).toFixed(2);

        printer.println(`${index + 1}. ${productName}`);
        printer.println(`   ${quantity} × ${price} = ${total} ج.م`);
      });

      printer.println('');
      printer.println('--------------------------------');
      printer.alignRight();
      printer.setTextSize('Large');
      printer.println(`الإجمالي: ${Number(order.totalAmount).toFixed(2)} ج.م`);
      printer.setTextSize('Medium');
      printer.alignCenter();
      printer.println('================================');
      printer.println('');
      printer.println('شكراً لتعاملكم معنا');
      printer.println('');
      printer.println('');
      printer.cut();

      const success = await printer.execute();
      if (success) {
        console.log(`✅ Invoice printed successfully for order #${order.id}`);
      } else {
        console.error(`❌ Failed to print order #${order.id}`);
      }
      resolve();
    } catch (printError) {
      console.error('Print error:', printError.message);
      resolve();
    }
  });
}

async function pollForNewOrders() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/orders/recent-for-print`, {
      params: { since: lastChecked },
      headers: { Authorization: `Bearer ${PRINTER_TOKEN}` },
    });

    const orders = response.data;
    if (orders.length > 0) {
      console.log(`📋 ${orders.length} new order(s) found`);
    }

    for (const order of orders) {
      console.log(`🖨️  Printing invoice for order #${order.id}...`);
      await printOrderInvoice(order);
      // Advance the watermark past this order so we never reprint it, even
      // if a later order in this batch fails.
      lastChecked = order.createdAt;
      saveLastChecked(lastChecked);
    }
  } catch (error) {
    if (error.response) {
      console.error(`❌ Backend error (${error.response.status}):`, error.response.data?.message || error.message);
    } else if (error.request) {
      console.error('❌ Could not reach backend:', error.message);
    } else {
      console.error('❌ Polling error:', error.message);
    }
  }
}

// Poll immediately on startup, then repeat on the interval.
pollForNewOrders();
setInterval(pollForNewOrders, POLL_INTERVAL_MS);

// Safety net: log unexpected errors instead of letting the service crash.
process.on('uncaughtException', (error) => {
  console.error('⚠️  Unexpected error (service stays alive):', error.message);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down printer service...');
  process.exit(0);
});