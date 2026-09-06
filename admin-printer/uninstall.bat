@echo off
chcp 65001 >nul
title إلغاء تثبيت خدمة الطابعة
color 0C

echo ============================================
echo    إلغاء تثبيت خدمة الطابعة
echo ============================================
echo.

node uninstall-service.js

echo.
echo تم الانتهاء.
pause
