require('dotenv').config();
const io = require('socket.io-client');
const axios = require('axios');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const PRINTER_TOKEN = process.env.PRINTER_TOKEN;

// U-POS UP300 vendor/product IDs
const PRINTER_VID = 0x0418;
const PRINTER_PID = 0x5011;

console.log('🖨️  Admin Printer Service Starting...');
console.log(`📡 Connecting to backend: ${BACKEND_URL}`);

// إنشاء اتصال بالطابعة عند الحاجة فقط (وقت الطباعة)، وليس عند بدء تشغيل الخدمة.
// كده لو الطابعة مش متصلة، الخدمة تفضل شغالة ومتصلة بالباك إند بدل ما توقف بالكامل.
function createPrinterDevice() {
  try {
    const device = new escpos.USB(PRINTER_VID, PRINTER_PID);
    const printer = new escpos.Printer(device);
    return { device, printer };
  } catch (error) {
    console.error('⚠️  لم يتم العثور على الطابعة أو أنها غير متصلة:', error.message);
    return null;
  }
}

// Connect to backend via Socket.IO
const socket = io(BACKEND_URL, {
  auth: {
    token: PRINTER_TOKEN
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to backend');
  socket.emit('join', { room: 'hq' });
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from backend');
});

// Listen for new orders
socket.on('order_created', async (data) => {
  console.log('📋 New order received:', data.orderId);
  await printInvoice(data.orderId);
});

socket.on('order_updated', async (data) => {
  console.log('📋 Order updated:', data.orderId);
  // Optionally print updated invoice
  // await printInvoice(data.orderId);
});

// Function to fetch order details
async function fetchOrderDetails(orderId) {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/orders/${orderId}/printer`, {
      headers: {
        'Authorization': `Bearer ${PRINTER_TOKEN}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching order details:', error.message);
    return null;
  }
}

// Function to print invoice
async function printInvoice(orderId) {
  // نحاول إنشاء اتصال بالطابعة الآن فقط، وقت الطباعة الفعلية
  const printerInstance = createPrinterDevice();
  if (!printerInstance) {
    console.error(`❌ تعذّر طباعة الطلب #${orderId}: الطابعة غير متصلة. سيتم استقبال الطلب بشكل طبيعي لكن لن تتم الطباعة.`);
    return;
  }

  const { device, printer } = printerInstance;

  try {
    const order = await fetchOrderDetails(orderId);
    if (!order) {
      console.error('Failed to fetch order details');
      return;
    }

    console.log('Printing invoice for order:', orderId);

    device.open((error) => {
      if (error) {
        console.error('Printer error:', error);
        return;
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

        // Print order items
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
          .close();

        console.log('✅ Invoice printed successfully');
      } catch (printError) {
        console.error('Print error:', printError);
        device.close();
      }
    });
  } catch (error) {
    console.error('Error printing invoice:', error);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down printer service...');
  socket.disconnect();
  process.exit(0);
});

// حماية إضافية: تسجيل أي خطأ غير متوقع في اللوج بدل ما يوقف الخدمة بالكامل
process.on('uncaughtException', (error) => {
  console.error('⚠️  خطأ غير متوقع (تم تجاهله لإبقاء الخدمة شغالة):', error.message);
});