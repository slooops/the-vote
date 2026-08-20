#!/usr/bin/env bash
# Deploy to production AND repoint the alias the group actually uses.
#
# `vercel --prod` alone is NOT enough: it creates a new deployment and updates
# Vercel's own auto-generated alias, but leaves the-vote-fox.vercel.app pinned
# to whatever it pointed at before. That's how prod once sat on a 36-day-old
# build while deploys "succeeded" and voters got 500s on every ballot.
#
# Usage: npm run deploy
set -euo pipefail

PROJECT="the-vote"
PROD_ALIAS="the-vote-fox.vercel.app"

echo "==> Deploying $PROJECT to production"
DEPLOY_URL="$(vercel --prod --project "$PROJECT" --yes 2>&1 | grep -oE 'https://the-vote-[a-z0-9]+-slooops-projects\.vercel\.app' | tail -1)"

if [ -z "$DEPLOY_URL" ]; then
  echo "!! Could not determine the new deployment URL. Deploy may have failed." >&2
  echo "!! $PROD_ALIAS was NOT repointed — check 'vercel ls $PROJECT'." >&2
  exit 1
fi
echo "==> Deployed: $DEPLOY_URL"

echo "==> Repointing $PROD_ALIAS"
vercel alias set "$DEPLOY_URL" "$PROD_ALIAS" >/dev/null
echo "==> Alias set"

echo "==> Verifying $PROD_ALIAS"
STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "https://$PROD_ALIAS")"
API_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "https://$PROD_ALIAS/api/sessions")"
echo "    homepage:     HTTP $STATUS"
echo "    api/sessions: HTTP $API_STATUS"

if [ "$STATUS" != "200" ] || [ "$API_STATUS" != "200" ]; then
  echo "!! $PROD_ALIAS is not healthy — investigate before telling anyone to vote." >&2
  exit 1
fi

echo ""
echo "✅ Live and verified: https://$PROD_ALIAS"
echo "   (serving $DEPLOY_URL)"
