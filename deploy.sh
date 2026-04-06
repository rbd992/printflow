#!/bin/bash
# PrintFlow Deploy Tool — Mac
# Usage: bash deploy.sh
# Or make executable: chmod +x deploy.sh && ./deploy.sh

set -e
cd "$(dirname "$0")"

echo ""
echo "=========================================="
echo "  PrintFlow Deploy Tool"
echo "=========================================="
echo ""

# Pull latest
echo "[1/6] Pulling latest changes..."
git pull origin main 2>/dev/null || echo "WARNING: Pull failed — may have local changes"

# Check for changes
STATUS=$(git status --porcelain)
HAS_CHANGES=0
[ -n "$STATUS" ] && HAS_CHANGES=1

if [ $HAS_CHANGES -eq 0 ]; then
    echo ""
    echo "No changes to commit."
    echo ""
else
    # Detect what changed
    CHANGED=$(git diff --name-only HEAD 2>/dev/null; git diff --cached --name-only 2>/dev/null; git status --porcelain 2>/dev/null)
    APP_CHANGED=0
    SERVER_CHANGED=0

    echo "$CHANGED" | grep -q "^server" && SERVER_CHANGED=1
    echo "$CHANGED" | grep -qE "^(src|public|assets|package\.json|\.github)" && APP_CHANGED=1

    # If nothing detected specifically, assume both
    [ $APP_CHANGED -eq 0 ] && [ $SERVER_CHANGED -eq 0 ] && APP_CHANGED=1 && SERVER_CHANGED=1

    echo ""
    echo "[2/6] Changes detected:"
    [ $APP_CHANGED -eq 1 ]    && echo "        App files changed — will trigger build workflow"
    [ $SERVER_CHANGED -eq 1 ] && echo "        Server files changed — will trigger server deploy"
    echo ""

    # Commit message
    read -p "[3/6] Commit message: " COMMIT_MSG
    [ -z "$COMMIT_MSG" ] && echo "ERROR: Commit message required" && exit 1

    echo ""
    echo "[4/6] Committing..."
    git add .
    git commit -m "$COMMIT_MSG"

    echo ""
    echo "[5/6] Pushing to GitHub..."
    git push origin main

    # Server only — done
    if [ $APP_CHANGED -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo "  Server deploy triggered!"
        echo "  GitHub Actions will deploy in ~2 min"
        echo "=========================================="
        echo ""
        exit 0
    fi
fi

# Ask about release
echo ""
read -p "[6/6] Create a new app release? (y/n): " DO_RELEASE
[ "$DO_RELEASE" != "y" ] && [ "$DO_RELEASE" != "yes" ] && {
    echo ""
    echo "=========================================="
    echo "  Pushed! No release created."
    echo "=========================================="
    echo ""
    exit 0
}

# Get current version
CURRENT_VER=$(node -p "require('./package.json').version" 2>/dev/null || grep '"version"' package.json | head -1 | awk -F'"' '{print $4}')
echo ""
echo "  Current version: $CURRENT_VER"
read -p "  New version (e.g. 1.0.9): " NEW_VER
[ -z "$NEW_VER" ] && echo "ERROR: Version required" && exit 1

# Update package.json
sed -i '' "s/\"version\": \"$CURRENT_VER\"/\"version\": \"$NEW_VER\"/" package.json

# Also update version strings in app files
find src -name "*.js" -exec grep -l "v$CURRENT_VER" {} \; | while read f; do
    sed -i '' "s/v$CURRENT_VER/v$NEW_VER/g" "$f"
    echo "  Updated version in $f"
done

# Commit version bump
git add .
git commit -m "v$NEW_VER release"
git push origin main

# Tag
git tag -d "v$NEW_VER" 2>/dev/null || true
git push origin ":refs/tags/v$NEW_VER" 2>/dev/null || true
git tag "v$NEW_VER"
git push origin "v$NEW_VER"

echo ""
echo "=========================================="
echo "  v$NEW_VER release triggered!"
echo "  GitHub Actions building Mac + Windows"
echo "  Check: github.com/rbd992/printflow/actions"
echo "  Build time: ~8 minutes"
echo "=========================================="
echo ""
