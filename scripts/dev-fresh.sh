#!/bin/sh

set -eu

PORT="${PORT:-3000}"

if lsof -ti "tcp:${PORT}" >/dev/null 2>&1; then
  echo "Stopping process on port ${PORT}..."
  lsof -ti "tcp:${PORT}" | xargs kill
  sleep 1
fi

echo "Cleaning local build cache..."
rm -rf .next tsconfig.tsbuildinfo

echo "Starting Next.js dev server on port ${PORT}..."
exec ./node_modules/.bin/next dev --hostname 0.0.0.0 --port "${PORT}"
