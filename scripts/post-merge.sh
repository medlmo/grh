#!/bin/bash
set -e

# Post-merge setup for GRH Souss-Massa
# Runs after every task merge: installs deps, syncs DB schema, rebuilds backend.

echo "==> Installing backend dependencies..."
cd backend
npm install --prefer-offline

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Pushing schema to database..."
npx prisma db push --accept-data-loss

echo "==> Building backend..."
chmod +x node_modules/.bin/nest
npm run build

echo "==> Done."
