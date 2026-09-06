# Admin Printer Service

خدمة طباعة الفواتير التلقائية للإدمن - تعمل على جهاز الإدمن وتطبع الفواتير فوراً عند استلام طلب جديد من أي فرع.

## المتطلبات

- Node.js (v14 أو أحدث)
- طابعة U-POS UP300 متصلة عبر USB
- توكن الطابعة من الباك إند

## التثبيت

1. انتقل لمجلد الخدمة:
```bash
cd admin-printer
```

2. قم بتثبيت الحزم المطلوبة:
```bash
npm install
```

3. أنشئ ملف `.env` وانسخ محتوى `.env.example`:
```bash
copy .env.example .env
```

4. عدل ملف `.env` وأضف:
```
BACKEND_URL=http://localhost:3001
PRINTER_TOKEN=your_printer_secret_token_here
```

## الحصول على PRINTER_TOKEN

1. افتح ملف `.env` في مجلد الباك إند
2. انسخ قيمة `PRINTER_TOKEN`
3. أضفها في ملف `.env` الخاص بخدمة الطابعة

## التشغيل

```bash
npm start
```

## كيفية العمل

1. الخدمة تتصل بالباك إند عبر Socket.IO
2. تنضم لغرفة 'hq' (الإدارة)
3. عند استلام طلب جديد من أي فرع، تستقبل إشعار `order_created`
4. تجلب تفاصيل الطلب من الباك إند
5. تطبع الفاتورة على طابعة U-POS UP300 المتصلة

## إعدادات الطابعة

الخدمة مُعدة للعمل مع طابعة U-POS UP300:
- Vendor ID: 0x0456
- Product ID: 0x0808

إذا كانت لديك طابعة مختلفة، عدل القيم في ملف `printer.js`:
```javascript
const device = new escposUSB.Device(VENDOR_ID, PRODUCT_ID);
```

## استكشاف الأخطاء

### الطابعة لا تعمل
- تأكد من توصيل الطابعة بالكمبيوتر
- تأكد من تثبيت تعريفات الطابعة
- في Windows: تأكد من أن الطابعة معروفة في Device Manager

### لا يمكن الاتصال بالباك إند
- تأكد من تشغيل الباك إند
- تأكد من صحة URL في ملف `.env`
- تأكد من صحة PRINTER_TOKEN

### لا يتم استلام إشعارات الطلبات
- تأكد من أن الخدمة متصلة (ستظهر رسالة "✅ Connected to backend")
- تأكد من أن الباك إند يرسل الإشعارات للغرفة 'hq'

## تشغيل الخدمة تلقائياً

### Windows
استخدم Task Scheduler لتشغيل الخدمة تلقائياً عند بدء تشغيل النظام:
1. افتح Task Scheduler
2. أنشئ مهمة جديدة
3. اضبطها لتشغيل `node printer.js` عند تسجيل الدخول
4. اضبط مجلد العمل لمجلد `admin-printer`

### Linux
استخدم systemd service:
```bash
sudo nano /etc/systemd/system/admin-printer.service
```

أضف المحتوى:
```
[Unit]
Description=Admin Printer Service
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/admin-printer
ExecStart=/usr/bin/node printer.js
Restart=always

[Install]
WantedBy=multi-user.target
```

ثم:
```bash
sudo systemctl enable admin-printer
sudo systemctl start admin-printer
```
