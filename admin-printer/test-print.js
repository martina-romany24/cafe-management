require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const PRINTER_NAME = process.env.PRINTER_NAME || 'Printer POS-80';

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

  let invoiceText = '═══════════════════════════════\n';
  invoiceText += '       ابن الباشا\n';
  invoiceText += '═══════════════════════════════\n\n';
  invoiceText += `رقم الطلب: ${testOrder.id.substring(0, 8)}\n`;
  invoiceText += `التاريخ: ${new Date(testOrder.createdAt).toLocaleString('ar-EG')}\n`;
  invoiceText += `الفرع: ${testOrder.branch.name}\n\n`;
  invoiceText += '───────────────────────────────\n';
  invoiceText += 'الأصناف:\n';
  invoiceText += '───────────────────────────────\n\n';

  testOrder.items.forEach((item, index) => {
    const productName = item.product.name;
    const quantity = item.quantity;
    const price = Number(item.priceAtSale).toFixed(2);
    const total = (Number(item.priceAtSale) * quantity).toFixed(2);

    invoiceText += `${index + 1}. ${productName}\n`;
    invoiceText += `   ${quantity} × ${price} = ${total} ج.م\n`;
  });

  invoiceText += '\n───────────────────────────────\n';
  invoiceText += `الإجمالي: ${Number(testOrder.totalAmount).toFixed(2)} ج.م\n`;
  invoiceText += '═══════════════════════════════\n\n';
  invoiceText += 'شكراً لزيارتكم\n\n';

  const tempFile = path.join(__dirname, `test-invoice-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, invoiceText, 'utf8');

  console.log('🖨️  Printing test invoice...');
  console.log(`📄 Target printer: ${PRINTER_NAME}`);
  
  const psCommand = `powershell -Command "$content = Get-Content '${tempFile}' -Encoding UTF8; $content | Out-Printer -Name '${PRINTER_NAME}'"`;
  exec(psCommand, (error, stdout, stderr) => {
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (error) {
      console.error('❌ Print error:', error.message);
      if (stderr) console.error('Stderr:', stderr);
      process.exit(1);
    } else {
      console.log('✅ Test invoice printed successfully!');
      process.exit(0);
    }
  });
}

printTestInvoice();
