#!/usr/bin/env bash
# Create GitHub repo (if needed) and push han-diorama. Requires: gh auth login
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_NAME="${1:-tang-changan}"
VISIBILITY="${2:-public}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run first: gh auth login"
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init
  git branch -M main
fi

if ! git rev-parse HEAD >/dev/null 2>&1; then
  git add -A
  git commit -m "Initial commit: 大唐长安 · 智机府 (han-diorama)"
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote origin exists, pushing..."
  git push -u origin main
else
  if [[ "$VISIBILITY" == "private" ]]; then
    gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
  else
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
  fi
fi

echo ""
echo "Done. Enable Pages: repo Settings → Pages → Source: GitHub Actions"
gh repo view --web 2>/dev/null || true
