@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set CLASSIC_SMOKE=
start "Classic Browser" "node_modules\electron\dist\electron.exe" .
