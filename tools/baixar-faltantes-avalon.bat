@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0baixar-faltantes-avalon.ps1"
pause
