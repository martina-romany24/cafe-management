require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PRINTER_TOKEN = process.env.PRINTER_TOKEN;
const POLL_INTERVAL_MS = 5000; // check for new orders every 5 seconds

// U-POS UP300 vendor/product IDs
const PRINTER_VID = 0x0418;
const PRINTER_PID = 0x5011;

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
    const device = new escpos.USB(PRINTER_VID, PRINTER_PID);
    const printer = new escpos.Printer(device);
    return { device, printer };
  } catch (error) {
    console.error('⚠️  Printer not found or not connected:', error.message);
    return null;
  }
}

function printOrderInvoice(order) {
  return new Promise((resolve) => {
    const printerInstance = createPrinterDevice();
    if (!printerInstance) {
      console.error(`❌ Could not print order #${order.id}: printer not connected.`);
      return resolve();
    }
    const { device, printer } = printerInstance;

    device.open((error) => {
      if (error) {
        console.error('Printer error:', error.message);
        return resolve();
      }

      try {
        printer
          .font('a')
          .align('ct')
          .size(1, 1)
          .text('================================')
          .size(2, 2)
          .text('فاتورة')
          .size(1, 1)
          .text('================================')
          .text('')
          .align('lt')
          .text(`رقم الطلب: #${order.id}`)
          .text(`التاريخ: ${new Date(order.createdAt).toLocaleString('ar-EG')}`)
          .text(`الفرع: ${order.branch?.name || 'الإدارة'}`)
          .text('')
          .text('--------------------------------')
          .text('المنتجات:')
          .text('--------------------------------')
          .text('');

        order.items?.forEach((item, index) => {
          const productName = item.product?.name || 'منتج غير معروف';
          const quantity = item.quantity;
          const price = Number(item.priceAtSale).toFixed(2);
          const total = (Number(item.priceAtSale) * quantity).toFixed(2);

          printer
            .text(`${index + 1}. ${productName}`)
            .text(`   ${quantity} × ${price} = ${total} ج.م`);
        });

        printer
          .text('')
          .text('--------------------------------')
          .align('rt')
          .size(2, 2)
          .text(`الإجمالي: ${Number(order.totalAmount).toFixed(2)} ج.م`)
          .size(1, 1)
          .text('================================')
          .text('')
          .align('ct')
          .text('شكراً لتعاملكم معنا')
          .text('')
          .text('')
          .cut()
          .close(() => resolve());

        console.log(`✅ Invoice printed successfully for order #${order.id}`);
      } catch (printError) {
        console.error('Print error:', printError.message);
        device.close();
        resolve();
      }
    });
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