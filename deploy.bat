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

git status --porcelain > "%TEMP%\pf_changed.txt" 2>nul

findstr /i "server" "%TEMP%\pf_changed.txt" >nul && set SERVER_CHANGED=1
findstr /i "src\\" "%TEMP%\pf_changed.txt" >nul && set APP_CHANGED=1
findstr /i "package.json" "%TEMP%\pf_changed.txt" >nul && set APP_CHANGED=1
findstr /i "public\\" "%TEMP%\pf_changed.txt" >nul && set APP_CHANGED=1

REM If nothing detected specifically, assume both
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
echo   Pushed! No app release created.
echo ==========================================
echo.
pause
exit /b 0

:do_release
echo.

REM Get current version from package.json
for /f %%v in ('node -e "console.log(require('./package.json').version)"') do set CURRENT_VER=%%v
echo   package.json version : v!CURRENT_VER!

REM Check if this version already exists as a GitHub tag (using git ls-remote, no HTTPS timeout issue)
echo   Checking GitHub for existing releases...
set GH_STATUS=404
  for /f "tokens=*" %%t in ('git ls-remote --tags origin refs/tags/v!CURRENT_VER! 2^>nul') do set GH_STATUS=200

REM Compute auto-suggested next patch version
for /f %%n in ('node -e "var v='!CURRENT_VER!'.split('.');v[2]=parseInt(v[2])+1;console.log(v.join('.'))"') do set NEXT_VER=%%n

if "!GH_STATUS!"=="200" (
    echo.
    echo   *** WARNING: v!CURRENT_VER! already exists on GitHub! ***
    echo   Running deploy twice at the same version causes the update
    echo   checker to see no new release and users won't be prompted.
    echo.
    echo   Current : v!CURRENT_VER!  ^(already released^)
    echo   Suggested: v!NEXT_VER!
    echo.
    set /p NEW_VER="   New version [press Enter to use !NEXT_VER!]: "
    if "!NEW_VER!"=="" set NEW_VER=!NEXT_VER!
) else (
    echo   v!CURRENT_VER! not yet released - OK to proceed.
    echo.
    set /p NEW_VER="   New version [press Enter to use !CURRENT_VER!]: "
    if "!NEW_VER!"=="" set NEW_VER=!CURRENT_VER!
)

if "!NEW_VER!"=="" (
    echo ERROR: Version required
    pause
    exit /b 1
)

REM Update version in package.json using Node.js
node -e "var fs=require('fs'),p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='!NEW_VER!';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');console.log('  package.json -> v!NEW_VER!');"

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
