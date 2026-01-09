#!/bin/bash
# Script to restart Convex backend and auto-update admin key in .env.local

set -e

echo "🔄 Restarting Convex backend..."
sudo docker compose restart backend

echo "⏳ Waiting for backend to be ready..."
sleep 3

# Wait for backend to be healthy
for i in {1..30}; do
    if curl -sf http://127.0.0.1:3210/version > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend did not become ready in time"
        exit 1
    fi
    sleep 1
done

echo "🔑 Generating new admin key..."
NEW_ADMIN_KEY=$(sudo docker compose exec -T backend ./generate_admin_key.sh | grep "convex-self-hosted|" | tr -d '\r\n')

if [ -z "$NEW_ADMIN_KEY" ]; then
    echo "❌ Failed to generate admin key"
    exit 1
fi

echo "📝 Updating .env.local with new admin key..."

# Backup current .env.local
cp .env.local .env.local.backup

# Update the admin key in .env.local
if grep -q "CONVEX_SELF_HOSTED_ADMIN_KEY=" .env.local; then
    # Replace existing key (using # as delimiter since the key contains |)
    sed -i "s#CONVEX_SELF_HOSTED_ADMIN_KEY=.*#CONVEX_SELF_HOSTED_ADMIN_KEY='${NEW_ADMIN_KEY}'#" .env.local
    echo "✅ Admin key updated in .env.local"
else
    # Add key if it doesn't exist
    echo "CONVEX_SELF_HOSTED_ADMIN_KEY='${NEW_ADMIN_KEY}'" >> .env.local
    echo "✅ Admin key added to .env.local"
fi

echo ""
echo "✨ Done! New admin key:"
echo "$NEW_ADMIN_KEY"
echo ""
echo "💡 Backup saved to .env.local.backup"
