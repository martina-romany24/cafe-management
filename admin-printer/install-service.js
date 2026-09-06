const Service = require('node-windows').Service;
const path = require('path');

// تعريف الخدمة
const svc = new Service({
  name: 'AdminPrinterService',
  description: 'خدمة طباعة الفواتير التلقائية لنظام إدارة الكافيه',
  script: path.join(__dirname, 'printer.js'),
  nodeOptions: [],
  workingDirectory: __dirname,
  // إعادة المحاولة تلقائيًا لو الخدمة وقعت لأي سبب
  maxRestarts: 10,
  wait: 2,
  grow: 0.25,
});

svc.on('install', () => {
  console.log('✅ تم تثبيت الخدمة بنجاح');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('ℹ️  الخدمة مثبتة بالفعل، جاري تشغيلها...');
  svc.start();
});

svc.on('start', () => {
  console.log('🚀 الخدمة شغالة الآن وستعمل تلقائيًا مع كل تشغيل للجهاز');
});

svc.on('error', (err) => {
  console.error('❌ حصل خطأ أثناء تثبيت الخدمة:', err);
});

svc.install();
