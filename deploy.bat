@echo off
setlocal EnableDelayedExpansion
title PrintFlow Deploy

echo.
echo ==========================================
echo   PrintFlow Deploy Tool
echo ==========================================
echo.

cd /d "%~dp0"

REM Check git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git not found. Install from https://git-scm.com
    pause
    exit /b 1
)

REM Pull latest changes first
echo [1/6] Pulling latest changes...
git pull origin main
if errorlevel 1 (
    echo WARNING: Pull failed - you may have uncommitted changes
)

REM Check if there are any changes to commit
git diff --quiet && git diff --cached --quiet
if errorlevel 1 (
    set HAS_CHANGES=1
) else (
    set HAS_CHANGES=0
)

git status --porcelain > "%TEMP%\pf_status.txt"
for %%A in ("%TEMP%\pf_status.txt") do set STATUS_SIZE=%%~zA
if %STATUS_SIZE% EQU 0 (
    set HAS_CHANGES=0
) else (
    set HAS_CHANGES=1
)

if %HAS_CHANGES%==0 (
    echo.
    echo No changes to commit.
    echo.
    goto :ask_release
)

REM Detect what changed
set APP_CHANGED=0
set SERVER_CHANGED=0

git diff --name-only HEAD > "%TEMP%\pf_changed.txt" 2>nul
git diff --cached --name-only >> "%TEMP%\pf_changed.txt" 2>nul
git status --porcelain >> "%TEMP%\pf_changed.txt" 2>nul

findstr /i "^server" "%TEMP%\pf_changed.txt" >nul && set SERVER_CHANGED=1
findstr /i "^src\|^public\|^assets\|package.json\|^.github" "%TEMP%\pf_changed.txt" >nul && set APP_CHANGED=1

REM If we can't detect specifically, assume both
if %APP_CHANGED%==0 if %SERVER_CHANGED%==0 (
    set APP_CHANGED=1
    set SERVER_CHANGED=1
)

echo.
echo [2/6] Changes detected:
if %APP_CHANGED%==1 echo         App files changed - will trigger build workflow
if %SERVER_CHANGED%==1 echo         Server files changed - will trigger server deploy workflow
echo.

REM Ask for commit message
set /p COMMIT_MSG="[3/6] Commit message: "
if "!COMMIT_MSG!"=="" (
    echo ERROR: Commit message required
    pause
    exit /b 1
)

REM Stage and commit
echo.
echo [4/6] Committing changes...
git add .
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
    echo ERROR: Commit failed
    pause
    exit /b 1
)

REM Push to main
echo.
echo [5/6] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: Push failed - check your credentials
    pause
    exit /b 1
)

REM If server only changed, we're done
if %APP_CHANGED%==0 (
    echo.
    echo ==========================================
    echo   Server deploy triggered!
    echo   GitHub Actions will deploy in ~2 min
    echo ==========================================
    echo.
    pause
    exit /b 0
)

:ask_release
REM Ask if this is a release
echo.
set /p DO_RELEASE="[6/6] Create a new app release? (y/n): "
if /i "!DO_RELEASE!"=="y" goto :do_release
if /i "!DO_RELEASE!"=="yes" goto :do_release

echo.
echo ==========================================
echo   Pushed! Server deploy triggered if
echo   server files changed.
echo   No app release created.
echo ==========================================
echo.
pause
exit /b 0

:do_release
REM Get current version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr "\"version\"" package.json') do (
    set CURRENT_VER=%%~a
)

echo.
echo   Current version: !CURRENT_VER!
set /p NEW_VER="   New version (e.g. 1.0.9): "
if "!NEW_VER!"=="" (
    echo ERROR: Version required
    pause
    exit /b 1
)

REM Update version in package.json
powershell -Command "(Get-Content package.json) -replace '\"version\": \"!CURRENT_VER!\"', '\"version\": \"!NEW_VER!\"' | Set-Content package.json"

REM Commit the version bump
git add package.json
git commit -m "v!NEW_VER! release"
git push origin main

REM Delete old tag if exists, create new one
git tag -d v!NEW_VER! >nul 2>&1
git push origin :refs/tags/v!NEW_VER! >nul 2>&1
git tag v!NEW_VER!
git push origin v!NEW_VER!

echo.
echo ==========================================
echo   v!NEW_VER! release triggered!
echo   GitHub Actions building Mac + Windows
echo   Check: github.com/rbd992/printflow/actions
echo   Build time: ~8 minutes
echo ==========================================
echo.
pause
