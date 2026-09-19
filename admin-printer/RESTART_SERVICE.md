# إعادة تشغيل خدمة الطابعة

بعد تحديث الكود والرابط، لازم تعيد تشغيل Windows Service عشان يقرأ الإعدادات الجديدة.

## الخطوات

### 1. افتح PowerShell كـ Administrator
- اضغط على Start
- اكتب "PowerShell"
- كليك يمين واختر "Run as Administrator"

### 2. أوقف الخدمة
```powershell
Stop-Service -Name "adminprinterservice" -Force
```

### 3. ابدأ الخدمة
```powershell
Start-Service -Name "adminprinterservice"
```

### 4. تأكد أن الخدمة شغالة
```powershell
Get-Service -Name "adminprinterservice"
```

يجب أن تظهر الحالة كـ "Running".

### 5. افحص اللوجات (اختياري)
```powershell
Get-Content "C:\Users\DELL\Downloads\cafe-management-system\cafe-management\admin-printer\daemon\adminprinterservice.out.log" -Tail 20
```

## اختبار الطباعة

بعد إعادة تشغيل الخدمة، جرّب طباعة فاتورة تجريبية:

```bash
cd C:\Users\DELL\Downloads\cafe-management-system\cafe-management\admin-printer
npm run test-print
```

لو الطباعة ناجحة، العربي هيظهر صح.

## لو الخدمة مش موجودة

لو الأمر `Stop-Service` أعطى خطأ أن الخدمة مش موجودة، ركّبها من جديد:

```bash
cd C:\Users\DELL\Downloads\cafe-management-system\cafe-management\admin-printer
node install-service.js
```
