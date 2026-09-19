# دليل النشر (Deployment Guide)

## نظرة عامة

هذا المشروع يستخدم GitHub integration للنشر التلقائي:
- **Backend**: Railway GitHub integration - كل push على branch `main` ينشر الباك إند تلقائياً
- **Frontend**: Cloudflare Workers Builds - كل push على branch `main` يبني وينشر الفرونت إند تلقائياً

## متغيرات البيئة المطلوبة

### Backend (Railway)

في Railway، اذهب إلى إعدادات الخدمة (Settings) ثم Variables، وأضف المتغيرات التالية:

| المتغير | الوصف | مثال |
|---------|-------|------|
| `DATABASE_URL` | رابط قاعدة بيانات PostgreSQL | `postgresql://user:password@host:port/database?schema=public` |
| `JWT_SECRET` | مفتاح تشفير JWT (يجب أن يكون طويلاً وعشوائياً) | `your_long_random_secret_here` |
| `JWT_EXPIRES_IN` | مدة صلاحية التوكن | `7d` |
| `PORT` | منفذ السيرفر | `5000` |
| `CLIENT_URL` | رابط الفرونت إند (مهم جداً لـ CORS) | `https://cafe-management.martinaromany289.workers.dev` |
| `PRINTER_TOKEN` | توكن لمصادقة خدمة الطابعة | `cafe_printer_x9k2m7p4q1` |

### Frontend (Cloudflare Workers)

في Cloudflare، اذهب إلى إعدادات الـ Worker ثم Settings -> Builds & deployments -> Environment variables، وأضف:

| المتغير | الوصف | مثال |
|---------|-------|------|
| `VITE_API_URL` | رابط API الباك إند (مع `/api` في الآخر) | `https://cafe-management-production-519b.up.railway.app/api` |
| `VITE_SOCKET_URL` | رابط Socket.IO الباك إند (بدون `/api`) | `https://cafe-management-production-519b.up.railway.app` |

## نقل المشروع لأكونت Railway جديد

إذا أردت نقل المشروع لأكونت Railway جديد (مثلاً عند تغيير الدومين):

### الخطوة 1: إنشاء مشروع جديد في Railway

1. سجل دخول في Railway بحسابك الجديد
2. أنشئ مشروع جديد (New Project)
3. اختر "Deploy from GitHub repo"
4. اختر الـ repo `martina-romany24/cafe-management`
5. حدد Root directory: `backend`
6. اضغط Deploy

### الخطوة 2: الحصول على الدومين الجديد

بعد انتهاء النشر، Railway سيعطيك دومين جديد مثل:
`https://cafe-management-production-xxxx.up.railway.app`

### الخطوة 3: تحديث متغيرات البيئة في Railway

1. في مشروع Railway الجديد، اذهب إلى Settings -> Variables
2. أضف/عدّل المتغيرات التالية:
   - `DATABASE_URL`: رابط قاعدة البيانات (يمكنك نقل قاعدة البيانات القديمة أو إنشاء جديدة)
   - `JWT_SECRET`: نفس القيمة القديمة (أو قيمة جديدة إذا أنشأت قاعدة بيانات جديدة)
   - `CLIENT_URL`: رابط الفرونت إند (لا يتغير عادة): `https://cafe-management.martinaromany289.workers.dev`
   - `PRINTER_TOKEN`: نفس القيمة القديمة
   - `PORT`: `5000`
   - `JWT_EXPIRES_IN`: `7d`

### الخطوة 4: تحديث إعدادات Cloudflare

1. اذهب إلى Cloudflare Dashboard -> Workers & Pages
2. اختر Worker `cafe-management`
3. اذهب إلى Settings -> Builds & deployments -> Environment variables
4. عدّل المتغيرات:
   - `VITE_API_URL`: ضع الدومين الجديد للباك إند مع `/api` في الآخر
     - مثال: `https://cafe-management-production-xxxx.up.railway.app/api`
   - `VITE_SOCKET_URL`: ضع الدومين الجديد للباك إند بدون `/api`
     - مثال: `https://cafe-management-production-xxxx.up.railway.app`

### الخطوة 5: تحديث admin-printer/.env (محلياً)

في ملف `admin-printer/.env` على جهازك:

```env
BACKEND_URL=https://cafe-management-production-xxxx.up.railway.app
PRINTER_TOKEN=cafe_printer_x9k2m7p4q1
PRINTER_NAME=Printer POS-80
```

### الخطوة 6: إعادة النشر

بعد تحديث المتغيرات:
- Railway سيعيد نشر الباك إند تلقائياً عند تغيير المتغيرات
- Cloudflare سيعيد بناء الفرونت إند عند الـ push التالي على GitHub

لإعادة بناء الفرونت إيد يدوياً:
1. اعمل commit صغير (مثلاً تعديل في README)
2. ادفع (push) إلى GitHub
3. Cloudflare سيعيد البناء تلقائياً

## مراجعة لوجات النشر

### Railway

1. اذهب إلى مشروع Railway
2. اضغط على الخدمة (backend)
3. اضغط على "View Logs" لرؤية لوجات السيرفر
4. يمكنك رؤية الأخطاء والتحذيرات هنا

### Cloudflare

1. اذهب إلى Cloudflare Dashboard -> Workers & Pages
2. اختر Worker `cafe-management`
3. اضغط على "Logs" أو "Deployments"
4. يمكنك رؤية تاريخ النشرات وأي أخطاء في البناء

## Service Worker

الـ Service Worker في `frontend/public/sw.js` تم إعداده لـ:
- **استثناء `/api` و `/socket.io`** من الكاش - هذه الطلبات تذهب مباشرة للشبكة
- **استثناء الطلبات غير GET** (POST, PUT, DELETE) من الكاش
- **تحديث تلقائي**: يستخدم `skipWaiting` و `clients.claim()` لضمان أن المستخدمين يحصلون على التحديثات فوراً

إذا واجهت مشكلة في كاش المتصفح بعد تغيير الروابط:
1. افتح DevTools (F12)
2. اذهب إلى Application -> Service Workers
3. اضغط "Unregister" على الـ Service Worker القديم
4. أعد تحميل الصفحة

## Health Check

يمكنك استخدام السكريبت التالي للتحقق من صحة الباك إند:

```bash
cd backend
npm run check:health
```

هذا السكريبت سيتحقق من:
- أن الباك إند يستجيب على `/health`
- أن CORS مضبوط بشكل صحيح
- أن Socket.IO يعمل

## مشاكل شائعة

### CORS Error

إذا ظهر خطأ CORS في المتصفح:
1. تأكد أن `CLIENT_URL` في Railway مضبوط على رابط الفرونت إند الصحيح
2. تأكد أن `VITE_API_URL` في Cloudflare مضبوط على رابط الباك إند الصحيح
3. أعد نشر الباك إند من Railway (سيحدث تلقائياً عند تغيير المتغيرات)

### Socket.IO Connection Failed

إذا فشل اتصال Socket.IO:
1. تأكد أن `VITE_SOCKET_URL` في Cloudflare مضبوط بشكل صحيح
2. تأكد أن الباك إند يعمل (افحص لوجات Railway)
3. تأكد أن `CLIENT_URL` في Railway مضبوط على رابط الفرونت إند

### البيانات القديمة في المتصفح

إذا رأيت بيانات قديمة بعد التحديث:
1. امسح كاش المتصفح (Ctrl+Shift+Delete)
2. أو استخدم وضع التصفح الخفي
3. أو ألغِ تسجيل الـ Service Worker كما هو موضح أعلاه
