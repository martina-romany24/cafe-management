require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');

// ---------------------------------------------------------------------------
// Configuration (all from .env)
// ---------------------------------------------------------------------------
const PRINTER_NAME = process.env.PRINTER_NAME || '';            // Windows printer name, e.g. "Printer POS-80"
const PAPER_WIDTH = parseInt(process.env.PAPER_WIDTH || '80', 10); // 58 or 80 (mm)
const CAFE_NAME = process.env.CAFE_NAME || 'ابن الباشا';
const MAX_HEIGHT = parseInt(process.env.MAX_INVOICE_HEIGHT || '4000', 10); // safety cap (pixels)
const INVOICE_FONT = process.env.INVOICE_FONT || 'Tahoma, "Segoe UI", Arial';
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

const PAPER_PX = PAPER_WIDTH === 58 ? 384 : 576; // dots per line (multiple of 8)
const CHUNK_ROWS = 256;                          // raster rows per GS v 0 command
const RAW_SCRIPT = path.join(__dirname, 'raw-print.ps1');
const PREVIEW_DIR = path.join(__dirname, 'preview');

// ---------------------------------------------------------------------------
// Invoice layout (single place to edit the template)
// ---------------------------------------------------------------------------
const fmtNum = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function fmtDate(value) {
  return new Date(value).toLocaleString('ar-EG-u-nu-latn', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (!cur || ctx.measureText(test).width <= maxWidth) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// Runs twice: draw=false to measure the height, draw=true to paint.
// Returns the final y (= needed height).
function renderInvoice(ctx, order, width, draw) {
  const margin = 12;
  const right = width - margin;
  const left = margin;
  let y = 16;

  ctx.textBaseline = 'top';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;

  const setFont = (size, bold) => { ctx.font = `${bold ? 'bold ' : ''}${size}px ${INVOICE_FONT}`; };
  const put = (str, x, yy, align) => {
    if (!draw) return;
    ctx.textAlign = align;
    ctx.fillText(str, x, yy);
  };
  const rule = () => {
    y += 6;
    if (draw) { ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(width - margin, y); ctx.stroke(); }
    y += 14;
  };

  // Cafe name
  setFont(26, true);
  put(CAFE_NAME, width / 2, y, 'center');
  y += 42;
  rule();

  // Order number + date/time
  setFont(18, false);
  put(`رقم الطلب: ${String(order.id).substring(0, 8)}`, right, y, 'right');
  y += 28;
  put(`التاريخ: ${fmtDate(order.createdAt)}`, right, y, 'right');
  y += 30;
  rule();

  // Items: name × qty on the right, line total on the left
  for (const item of order.items || []) {
    const name = item.product?.name || 'منتج غير معروف';
    const qty = Number(item.quantity);
    const unit = Number(item.priceAtSale);
    const totalStr = `${fmtNum(unit * qty)} ج.م`;

    setFont(18, true);
    const totalW = ctx.measureText(totalStr).width;
    setFont(18, false);
    const lines = wrapText(ctx, `${name} × ${qty}`, width - margin * 2 - totalW - 14);

    lines.forEach((ln, i) => {
      setFont(18, false);
      put(ln, right, y, 'right');
      if (i === 0) { setFont(18, true); put(totalStr, left, y, 'left'); }
      y += 28;
    });
    if (qty > 1) {
      setFont(15, false);
      put(`سعر الوحدة ${fmtNum(unit)} ج.م`, right, y, 'right');
      y += 24;
    }
    y += 8;
  }

  rule();

  // Total
  setFont(24, true);
  put('الإجمالي', right, y, 'right');
  put(`${fmtNum(Number(order.totalAmount))} ج.م`, left, y, 'left');
  y += 40;

  return y + 20; // bottom padding
}

function generateInvoiceImage(order) {
  const measure = createCanvas(PAPER_PX, 10);
  const height = Math.ceil(renderInvoice(measure.getContext('2d'), order, PAPER_PX, false));
  if (height > MAX_HEIGHT) {
    throw new Error(`الفاتورة أطول من الحد الأقصى (${height} > ${MAX_HEIGHT} بكسل). زوّد MAX_INVOICE_HEIGHT لو ده طبيعي.`);
  }
  const canvas = createCanvas(PAPER_PX, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAPER_PX, height);
  renderInvoice(ctx, order, PAPER_PX, true);
  return canvas;
}

// ---------------------------------------------------------------------------
// Bitmap -> ESC/POS raster
// ---------------------------------------------------------------------------
function canvasToBitmap(canvas) {
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap = Buffer.alloc(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 150) bitmap[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return { bitmap, bytesPerRow, height };
}

function buildEscPos(canvas) {
  const { bitmap, bytesPerRow, height } = canvasToBitmap(canvas);
  const parts = [Buffer.from([0x1b, 0x40])]; // ESC @ (initialize)

  for (let row = 0; row < height; row += CHUNK_ROWS) {
    const rows = Math.min(CHUNK_ROWS, height - row);
    // GS v 0 m xL xH yL yH : width is in BYTES, height in dots
    parts.push(Buffer.from([
      0x1d, 0x76, 0x30, 0x00,
      bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
      rows & 0xff, (rows >> 8) & 0xff,
    ]));
    parts.push(bitmap.subarray(row * bytesPerRow, (row + rows) * bytesPerRow));
  }

  parts.push(Buffer.from([0x1b, 0x64, 0x04]));       // ESC d 4 (feed 4 lines)
  parts.push(Buffer.from([0x1d, 0x56, 0x42, 0x00])); // GS V 66 0 (feed + cut)
  return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------
// RAW send to the Windows spooler (winspool) via raw-print.ps1
// ---------------------------------------------------------------------------
function sendRaw(buffer) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `invoice-${Date.now()}-${process.pid}.bin`);
    fs.writeFileSync(tmp, buffer);
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', RAW_SCRIPT,
      '-PrinterName', PRINTER_NAME, '-FilePath', tmp];
    execFile('powershell.exe', args, { timeout: 30000, windowsHide: true }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
      if (err) return reject(new Error((stderr || err.message).toString().trim()));
      const m = /SENT:(\d+)/.exec(stdout || '');
      if (!m) return reject(new Error(`رد غير متوقع من PowerShell: ${stdout}`));
      resolve(parseInt(m[1], 10));
    });
  });
}

function savePreview(canvas, order) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const file = path.join(PREVIEW_DIR, `invoice-${String(order.id).substring(0, 8)}-${Date.now()}.png`);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  return file;
}

// ---------------------------------------------------------------------------
// Public: print one order. Never throws; returns true/false.
// ---------------------------------------------------------------------------
async function printOrderInvoice(order) {
  const tag = `#${String(order.id).substring(0, 8)}`;
  try {
    const canvas = generateInvoiceImage(order);
    console.log(`📄 Invoice ${tag}: ${canvas.width}x${canvas.height}px (${PAPER_WIDTH}mm)`);

    if (DRY_RUN) {
      console.log(`🧪 DRY RUN — saved preview (nothing sent to printer): ${savePreview(canvas, order)}`);
      return true;
    }
    if (!PRINTER_NAME) throw new Error('PRINTER_NAME غير مضبوط في .env (مش هطبع على الطابعة الافتراضية)');

    const data = buildEscPos(canvas);
    console.log(`🖨️  Sending ${data.length} bytes RAW to "${PRINTER_NAME}"`);
    const sent = await sendRaw(data);
    if (sent !== data.length) throw new Error(`اتبعت ${sent} بايت من ${data.length}`);
    console.log(`✅ Printed ${tag} (${sent} bytes)`);
    return true;
  } catch (error) {
    console.error(`❌ Print failed for ${tag}: ${error.message}`);
    console.error(`   Printer: ${PRINTER_NAME || '(not set)'} | Paper: ${PAPER_WIDTH}mm`);
    return false;
  }
}

function buildTestOrder() {
  return {
    id: 'test-order-12345678',
    createdAt: new Date().toISOString(),
    totalAmount: 75,
    items: [
      { product: { name: 'قهوة' }, quantity: 1, priceAtSale: 25 },
      { product: { name: 'عصير' }, quantity: 1, priceAtSale: 30 },
      { product: { name: 'ساندوتش' }, quantity: 1, priceAtSale: 20 },
    ],
  };
}

module.exports = {
  PRINTER_NAME, PAPER_WIDTH, DRY_RUN,
  generateInvoiceImage, buildEscPos, printOrderInvoice, buildTestOrder,
};