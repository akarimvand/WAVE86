@echo off
title WAVE86 DEV WATCHDOG
cd /d C:\xampp\htdocs\WAVE86

:loop
echo [%date% %time%] starting server...
npm run dev >> dev_out.txt 2>&1
echo [%date% %time%] !! SERVER EXITED (code %errorlevel%) - restarting in 3s !!
timeout /t 3 /nobreak > nul
goto loop
