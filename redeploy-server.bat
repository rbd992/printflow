@echo off
title PrintFlow — Redeploy Server
echo.
echo ==========================================
echo   PrintFlow Server Redeploy
echo   Triggers Build ^& Push Server Image
echo ==========================================
echo.

cd /d "%~dp0"

echo Triggering server workflow via workflow_dispatch...
echo.

REM Use GitHub CLI if available
gh --version >nul 2>&1
if not errorlevel 1 (
    echo Using GitHub CLI...
    gh workflow run build-docker.yml --repo rbd992/printflow
    if errorlevel 1 (
        echo GitHub CLI trigger failed, falling back to git push method...
        goto :git_method
    )
    echo.
    echo ==========================================
    echo   Server workflow triggered!
    echo   Check: github.com/rbd992/printflow/actions
    echo   Build time: ~3 minutes
    echo ==========================================
    echo.
    pause
    exit /b 0
)

:git_method
echo GitHub CLI not found, using git push method...
echo.

REM Touch a server file to trigger the paths filter
echo // redeployed %DATE% %TIME% > server\src\.redeploy
git add server\src\.redeploy
git commit -m "chore: trigger server redeploy"
git push origin main

echo.
echo ==========================================
echo   Server deploy triggered via git push!
echo   Check: github.com/rbd992/printflow/actions
echo   Build time: ~3 minutes
echo ==========================================
echo.
pause
