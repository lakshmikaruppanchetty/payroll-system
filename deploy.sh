#!/bin/bash

# Ensure the script exits if any command fails
set -e

# Use the first argument as the commit message, or default to a generic message
COMMIT_MSG=${1:-"Update payroll system code"}

echo "📦 Staging changes for git..."
git add .

echo "📝 Committing changes with message: '$COMMIT_MSG'..."
git commit -m "$COMMIT_MSG" || echo "No changes to commit."

echo "🚀 Pushing to GitHub main branch..."
git push origin main

echo "🔥 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ All done! GitHub and Firebase are now 100% in sync."
