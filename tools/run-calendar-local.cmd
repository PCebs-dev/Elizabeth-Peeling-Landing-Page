@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0\.."
if not exist "logs" mkdir logs
echo ===== %date% %time% =====>> logs\calendar-daily.log
call npm run studio:calendar-daily >> logs\calendar-daily.log 2>&1
echo exit=%ERRORLEVEL%>> logs\calendar-daily.log
endlocal
