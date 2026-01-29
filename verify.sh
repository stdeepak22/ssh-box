#!/bin/bash
set -e

BASE_URL="http://localhost:3000"
echo "Waiting for services..."
sleep 5

echo "Checking health..."
curl -sf "$BASE_URL/health" || (echo "Health check failed" && exit 1)
echo " OK"

echo "Creating tables..."
export DYNAMODB_ENDPOINT="http://localhost:8000"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="dummy"
export AWS_SECRET_ACCESS_KEY="dummy"
export USERS_TABLE="Users"
export USER_SECRETS_TABLE="UserSecrets"
# We need to run this from root
npx ts-node packages/backend/src/scripts/create-tables.ts

echo "Registering..."
curl -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}' || echo "User might exist"

echo "Logging in..."
TOKEN_JSON=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}')
TOKEN=$(echo "$TOKEN_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).token)")

if [ "$TOKEN" == "undefined" ]; then
    echo "Login failed: $TOKEN_JSON"
    exit 1
fi
echo "Got Token"

echo "Adding Secret..."
curl -s -X POST "$BASE_URL/secrets" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"my-secret","ciphertext":"encrypted","salt":"salt","iv":"iv","metadata":{"authTag":"tag"}}'
echo "Secret Added"

echo "Getting Secret..."
RESP=$(curl -s -X GET "$BASE_URL/secrets" -H "Authorization: Bearer $TOKEN")
echo "Secrets: $RESP"

if [[ $RESP == *"my-secret"* ]]; then
    echo "Verification SUCCESS!"
else
    echo "Secret NOT found!"
    exit 1
fi
