require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { exec } = require('child_process');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PRINTER_TOKEN = process.env.PRINTER_TOKEN;
const POLL_INTERVAL_MS = 5000; // check for new orders every 5 seconds
const PRINTER_NAME = process.env.PRINTER_NAME || 'Printer POS-80';

// Where we remember the last time we successfully checked for orders, so a
// restart doesn't reprint old invoices or miss ones that arrived while the
// service was down.
const STATE_FILE = path.join(__dirname, 'last-checked.json');

console.log('🖨️  Admin Printer Service Starting...');
console.log(`📡 Backend: ${BACKEND_URL}`);
console.log(`⏱️  Polling every ${POLL_INTERVAL_MS / 1000}s for new orders`);
console.log(`🖨️  Target printer: ${PRINTER_NAME}`);

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

function printOrderInvoice(order) {
  return new Promise((resolve) => {
    try {
      // Build invoice text with Arabic support
      let invoiceText = '═══════════════════════════════\n';
      invoiceText += '       ابن الباشا\n';
      invoiceText += '═══════════════════════════════\n\n';
      invoiceText += `رقم الطلب: ${order.id.substring(0, 8)}\n`;
      invoiceText += `التاريخ: ${new Date(order.createdAt).toLocaleString('ar-EG')}\n`;
      invoiceText += `الفرع: ${order.branch?.name || 'الإدارة'}\n\n`;
      invoiceText += '───────────────────────────────\n';
      invoiceText += 'الأصناف:\n';
      invoiceText += '───────────────────────────────\n\n';

      order.items?.forEach((item, index) => {
        const productName = item.product?.name || 'منتج غير معروف';
        const quantity = item.quantity;
        const price = Number(item.priceAtSale).toFixed(2);
        const total = (Number(item.priceAtSale) * quantity).toFixed(2);

        invoiceText += `${index + 1}. ${productName}\n`;
        invoiceText += `   ${quantity} × ${price} = ${total} ج.م\n`;
      });

      invoiceText += '\n───────────────────────────────\n';
      invoiceText += `الإجمالي: ${Number(order.totalAmount).toFixed(2)} ج.م\n`;
      invoiceText += '═══════════════════════════════\n\n';
      invoiceText += 'شكراً لزيارتكم\n\n';

      // Create temporary file with UTF-8 encoding for Arabic support
      const tempFile = path.join(__dirname, `temp-invoice-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, invoiceText, 'utf8');

      // Print using PowerShell with Arabic font support
      const psCommand = `powershell -Command "$content = Get-Content '${tempFile}' -Encoding UTF8; $content | Out-Printer -Name '${PRINTER_NAME}'"`;
      exec(psCommand, (error, stdout, stderr) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (error) {
          console.error(`❌ Print error for order #${order.id}:`, error.message);
          if (stderr) console.error('Stderr:', stderr);
          resolve();
        } else {
          console.log(`✅ Invoice printed successfully for order #${order.id}`);
          resolve();
        }
      });
    } catch (error) {
      console.error('Print error:', error.message);
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

// Test print function - call this manually to test printer
function printTestInvoice() {
  const testOrder = {
    id: 'test-order-12345678',
    createdAt: new Date().toISOString(),
    branch: { name: 'فرع تجريبي' },
    totalAmount: 150.50,
    items: [
      { product: { name: 'قهوة' }, quantity: 2, priceAtSale: 25.00 },
      { product: { name: 'كيكة' }, quantity: 1, priceAtSale: 100.50 }
    ]
  };
  console.log('🖨️  Printing test invoice...');
  printOrderInvoice(testOrder);
}

// Uncomment the line below to print a test invoice when starting the service
// printTestInvoice();

// Safety net: log unexpected errors instead of letting the service crash.
process.on('uncaughtException', (error) => {
  console.error('⚠️  Unexpected error (service stays alive):', error.message);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down printer service...');
  process.exit(0);
});