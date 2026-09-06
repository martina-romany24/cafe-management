const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'AdminPrinterService',
  script: path.join(__dirname, 'printer.js'),
});

svc.on('uninstall', () => {
  console.log('🗑️  تم إلغاء تثبيت الخدمة بنجاح');
});

svc.on('error', (err) => {
  console.error('❌ حصل خطأ أثناء إلغاء التثبيت:', err);
});

svc.uninstall();
