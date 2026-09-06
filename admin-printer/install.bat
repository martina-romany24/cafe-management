@echo off
chcp 65001 >nul
title تثبيت خدمة الطابعة
color 0A

echo ============================================
echo    تثبيت خدمة الطابعة - Admin Printer
echo ============================================
echo.

REM التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] Node.js مش متثبت على الجهاز ده.
    echo.
    echo من فضلك نزّل وثبّت Node.js أولاً من الرابط ده:
    echo https://nodejs.org
    echo.
    echo بعد التثبيت، شغّل هذا الملف مرة أخرى.
    pause
    exit /b 1
)
echo [تم] Node.js موجود ✓
echo.

REM تثبيت مكتبات المشروع
echo [1/4] جاري تثبيت المكتبات المطلوبة...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [خطأ] فشل تثبيت المكتبات. راجع الرسائل أعلاه.
    pause
    exit /b 1
)
echo [تم] تثبيت المكتبات ✓
echo.

REM تثبيت أداة تشغيل الخدمة كخدمة ويندوز
echo [2/4] جاري تثبيت أداة تشغيل الخدمة...
call npm install node-windows
if %errorlevel% neq 0 (
    echo.
    echo [خطأ] فشل تثبيت node-windows.
    pause
    exit /b 1
)
echo [تم] ✓
echo.

REM إعداد ملف .env لو مش موجود
if not exist ".env" (
    echo [3/4] جاري إنشاء ملف الإعدادات...
    copy .env.example .env >nul
    echo.
    echo تنبيه هام: تم إنشاء ملف .env جديد.
    echo افتح الملف .env وتأكد من صحة القيم بداخله قبل المتابعة.
    echo.
    notepad .env
    echo.
    echo بعد ما تحفظ الملف وتقفله، اضغط أي زر للمتابعة...
    pause >nul
) else (
    echo [3/4] ملف الإعدادات .env موجود بالفعل، تخطي هذه الخطوة...
)
echo.

REM تثبيت الخدمة كخدمة ويندوز تعمل تلقائياً
echo [4/4] جاري تسجيل الخدمة لتعمل تلقائياً مع كل تشغيل للجهاز...
node install-service.js

echo.
echo ============================================
echo    تم التثبيت بنجاح! 🎉
echo    الخدمة ستعمل تلقائياً من الآن فصاعداً
echo    حتى بعد إعادة تشغيل الجهاز
echo ============================================
echo.
echo يمكنك إغلاق هذه النافذة الآن.
pause
