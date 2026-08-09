# نظام إدارة الكافيه (Cafe HQ + Branches Management System)

نظام Full Stack لإدارة كافيه رئيسي (HQ) يتحكم في 3 فروع تابعة له: منتجات وأسعار مركزية، هامش ربح مستقل لكل فرع (نسبة % أو قيمة ثابتة)، نقطة بيع مبسطة للفروع، وتقارير شهرية تلقائية.

## التقنيات المستخدمة

**Backend:** Node.js, Express, PostgreSQL, Prisma, JWT, bcrypt, Zod, node-cron, Socket.io, exceljs, pdfkit

**Frontend:** React (Vite), React Router, TanStack Query, Zustand, React Hook Form, Tailwind CSS, Recharts, Socket.io-client

## هيكل المشروع

```
cafe-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # مخطط قاعدة البيانات
│   │   └── seed.js            # بيانات تجريبية
│   └── src/
│       ├── config/            # اتصال Prisma
│       ├── controllers/       # منطق الـ Request/Response
│       ├── middleware/        # Auth, RBAC, Validation, Error handling
│       ├── routes/            # تعريف الـ Endpoints
│       ├── services/          # منطق الأعمال (Business logic)
│       ├── sockets/           # Socket.io
│       ├── cron/              # المهام المجدولة (التقارير الشهرية)
│       ├── utils/             # دالة حساب الأسعار الموحدة
│       ├── app.js
│       └── server.js
└── frontend/
    └── src/
        ├── api/                # Axios client + كل استدعاءات الـ API
        ├── components/         # مكونات مشتركة (Layout, Modal)
        ├── hooks/              # useSocket
        ├── store/              # Zustand auth store
        ├── routes/             # ProtectedRoute
        └── pages/
            ├── admin/          # لوحة تحكم الرئيسي
            └── branch/         # لوحة تحكم مدير الفرع
```

## 1. متطلبات التشغيل

- Node.js 18+ و npm
- PostgreSQL 14+ (محلي أو سحابي)

## 2. تشغيل قاعدة البيانات

### الخيار 1: PostgreSQL محلي

1. قم بتثبيت PostgreSQL على جهازك:
   - **Windows:** حمّل من [postgresql.org](https://www.postgresql.org/download/windows/)
   - **macOS:** استخدم Homebrew: `brew install postgresql`
   - **Linux:** `sudo apt install postgresql postgresql-contrib`

2. أنشئ قاعدة بيانات باسم `cafe_management`:
   ```bash
   # على Windows (بعد تثبيت PostgreSQL)
   psql -U postgres -c "CREATE DATABASE cafe_management;"
   
   # على macOS/Linux
   createdb cafe_management
   ```

### الخيار 2: PostgreSQL سحابي (مجاني)

استخدم خدمة سحابية مثل:
- **Neon:** [neon.tech](https://neon.tech) - مجاني ويدعم Prisma مباشرة
- **Supabase:** [supabase.com](https://supabase.com) - مجاني مع واجهة سهلة
- **Railway:** [railway.app](https://railway.app) - سهل الاستخدام

بعد إنشاء قاعدة البيانات السحابية، ستحصل على `DATABASE_URL` لاستخدامه في ملف `.env`.

## 3. تشغيل الـ Backend

```bash
cd backend
npm install
cp .env.example .env
# عدّل DATABASE_URL و JWT_SECRET في .env حسب بيئتك

npx prisma migrate dev --name init   # ينشئ الجداول في قاعدة البيانات
npm run seed                         # يضيف بيانات تجريبية (Admin + 3 فروع + منتجات)

npm run dev                          # يشغل السيرفر على http://localhost:5000
```

### حسابات تجريبية (بعد الـ seed)

| الدور | البريد الإلكتروني | كلمة المرور |
|---|---|---|
| Admin (الرئيسي) | admin@cafe.com | Password123 |
| مدير فرع 1 | manager1@cafe.com | Password123 |
| مدير فرع 2 | manager2@cafe.com | Password123 |
| مدير فرع 3 | manager3@cafe.com | Password123 |

## 4. تشغيل الـ Frontend

في نافذة طرفية جديدة:

```bash
cd frontend
npm install
npm run dev                          # يشغل الواجهة على http://localhost:5173
```

الواجهة تتصل بالـ backend افتراضيًا على `http://localhost:5000/api`. لتغيير هذا، أنشئ ملف `.env` في مجلد `frontend`:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 5. تجربة النظام

1. افتح `http://localhost:5173` وسجل دخول بحساب Admin.
2. من صفحة "المنتجات والأسعار" جرّب تعديل هامش ربح فرع معين على منتج ولاحظ المعاينة الفورية.
3. افتح نافذة أخرى (أو متصفح خفي) وسجل دخول بحساب `manager1@cafe.com` → اذهب لـ "نقطة البيع" وسجل طلب.
4. ارجع لحساب Admin ولاحظ أن لوحة التحكم والتقارير تحدّثت.
5. من صفحة "التقارير الشهرية" اضغط "إعادة حساب يدوي" لتوليد تقرير الشهر الحالي، ثم جرّب تصدير Excel/PDF.

## 6. آلية حساب الأسعار (مرجع سريع)

```
Percentage: finalPrice = basePrice + (basePrice * marginValue)
Fixed:      finalPrice = basePrice + marginValue
hqRevenue   = basePrice * quantity   (دائمًا)
branchProfit = (finalPrice - basePrice) * quantity
```

الدالة موجودة في `backend/src/utils/pricing.js` وتُستخدم في كل مكان (عرض المنتجات للفرع، تسجيل الطلبات، التقارير الشهرية) لضمان اتساق الحسابات.

## 7. الصلاحيات (RBAC) - كيف تم فرضها

- كل الحماية مُطبّقة على مستوى الـ Backend (middleware `authenticate` + `requireRole`)، وليس فقط الواجهة.
- مدير الفرع لا يستطيع الوصول لبيانات فرع آخر: أي endpoint يستقبل `branchId` من التوكن مباشرة وليس من الطلب (`req.user.branchId`)، لذلك حتى لو عدّل الطلب يدويًا (Postman مثلاً) لن يستطيع الوصول لفرع آخر.
- مسارات إضافة/تعديل/حذف المنتجات وهوامش الربح محمية بـ `requireRole('admin')` فقط.
- عرض المنتجات لمدير الفرع (`GET /api/products`) يرجع فقط `price` النهائي، بدون `basePrice` أو `marginValue` أو `hqRevenue`.

## 8. النشر السحابي (Deployment) لاحقًا

- **Backend:** يمكن نشره على Render / Railway / Fly.io. اضبط `DATABASE_URL` على قاعدة بيانات PostgreSQL سحابية (مثل Neon أو Supabase أو RDS)، وشغّل `npx prisma migrate deploy` بدل `migrate dev`.
- **Frontend:** يمكن نشره على Vercel / Netlify كموقع ثابت (`npm run build` ثم رفع مجلد `dist`)، مع ضبط `VITE_API_URL` على رابط الـ backend المنشور.
- **Socket.io:** تأكد أن منصة الاستضافة تدعم WebSocket (Render وRailway يدعمونها افتراضيًا).
- **CORS:** اضبط متغير `CLIENT_URL` في backend `.env` على رابط الواجهة المنشورة.
- **الأمان:** غيّر `JWT_SECRET` لقيمة عشوائية طويلة في بيئة الإنتاج، ولا ترفع ملف `.env` لأي مستودع Git.

## 9. التوسع المستقبلي

- إضافة فرع رابع: من واجهة "الفروع" مباشرة (Admin)، بدون أي تعديل بالكود.
- إضافة نوع منتج جديد (حلويات مثلًا): يكفي إدخاله من "المنتجات" مع تحديد `category`، فالنظام مصمم ليتعامل مع أي عدد من التصنيفات.
- الجدول `BranchProductPricing` مصمم بعلاقة many-to-many بين الفروع والمنتجات، لذا إضافة فروع أو منتجات جديدة لا تتطلب أي تغيير هيكلي.
