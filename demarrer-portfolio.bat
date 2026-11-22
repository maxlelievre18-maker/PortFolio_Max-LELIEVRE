@echo off
setlocal
title Portfolio Max Lelievre - Gestionnaire local
cd /d "%~dp0"

echo Demarrage du serveur local du portfolio...
echo Gestionnaire : http://127.0.0.1:8765/admin/
echo Apercu du site : http://127.0.0.1:8765/
echo.

node "%~dp0project_manager.mjs"
set "SERVER_EXIT=%ERRORLEVEL%"

if not "%SERVER_EXIT%"=="0" (
  echo.
  echo Le serveur s'est arrete avec le code d'erreur %SERVER_EXIT%.
) else (
  echo.
  echo Le serveur local est arrete.
)

echo Ferme cette fenetre quand tu as termine.
pause
exit /b %SERVER_EXIT%
