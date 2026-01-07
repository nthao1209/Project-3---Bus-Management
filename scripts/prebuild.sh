#!/bin/bash

# Script to pre-build critical pages for optimal distribution
# Run before deployment or during CI/CD

echo "🔨 Building Next.js application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Build complete. App is ready for distribution."
echo "📦 All pages are pre-compiled and optimized."
