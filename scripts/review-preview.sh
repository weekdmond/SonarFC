#!/bin/sh

set -eu

PORT="${PORT:-3001}"

if lsof -ti "tcp:${PORT}" >/dev/null 2>&1; then
  echo "Stopping existing preview on port ${PORT}..."
  lsof -ti "tcp:${PORT}" | xargs kill
  sleep 1
fi

echo "Running clean verification build..."
npm run verify

echo "Starting stable preview on port ${PORT}..."
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "${PORT}"
