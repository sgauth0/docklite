#!/bin/bash

# Vertex AI Setup Script for DockLite
# This script automates the setup of Vertex AI for your project

set -e

echo "🚀 DockLite Vertex AI Setup"
echo "=============================="
echo ""

# Configuration from your GCP account
export PROJECT_ID="project-1aa57ee1-4941-4434-915"
export BILLING_ACCOUNT="017F98-E21A09-C5610A"
export LOCATION="us-central1"

echo "📋 Using configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Billing Account: $BILLING_ACCOUNT"
echo "  Location: $LOCATION"
echo ""

# Step 1: Set active project
echo "1️⃣  Setting active GCP project..."
gcloud config set project $PROJECT_ID

# Step 2: Verify billing is linked
echo "2️⃣  Verifying billing is enabled..."
gcloud billing projects describe $PROJECT_ID || \
  gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT

# Step 3: Enable required APIs
echo "3️⃣  Enabling required APIs..."
echo "   - Vertex AI API"
gcloud services enable aiplatform.googleapis.com --quiet

echo "   - Compute Engine API"
gcloud services enable compute.googleapis.com --quiet

echo "   - Cloud Resource Manager API"
gcloud services enable cloudresourcemanager.googleapis.com --quiet

# Step 4: Create service account
echo "4️⃣  Creating service account..."
SERVICE_ACCOUNT_EMAIL="docklite-vertex@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if service account exists
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
  echo "   ℹ️  Service account already exists"
else
  gcloud iam service-accounts create docklite-vertex \
    --display-name="DockLite Vertex AI Service Account" \
    --description="Service account for DockLite to access Vertex AI"
  echo "   ✅ Service account created"
fi

# Step 5: Grant permissions
echo "5️⃣  Granting IAM permissions..."

echo "   - Granting Vertex AI User role"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user" \
  --quiet

echo "   - Granting Service Usage Consumer role"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/serviceusage.serviceUsageConsumer" \
  --quiet

# Step 6: Create credentials directory
echo "6️⃣  Creating credentials directory..."
mkdir -p gcp-credentials

# Step 7: Generate service account key
echo "7️⃣  Generating service account key..."
KEY_FILE="gcp-credentials/docklite-vertex-key.json"

if [ -f "$KEY_FILE" ]; then
  echo "   ⚠️  Key file already exists at $KEY_FILE"
  read -p "   Do you want to create a new key? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm "$KEY_FILE"
    gcloud iam service-accounts keys create "$KEY_FILE" \
      --iam-account=$SERVICE_ACCOUNT_EMAIL
    echo "   ✅ New key created"
  fi
else
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account=$SERVICE_ACCOUNT_EMAIL
  echo "   ✅ Key created at $KEY_FILE"
fi

# Step 8: Set file permissions
echo "8️⃣  Setting secure file permissions..."
chmod 600 "$KEY_FILE"

# Step 9: Update .gitignore
echo "9️⃣  Updating .gitignore..."
if ! grep -q "gcp-credentials/" .gitignore 2>/dev/null; then
  echo "gcp-credentials/" >> .gitignore
fi
if ! grep -q ".env.local" .gitignore 2>/dev/null; then
  echo ".env.local" >> .gitignore
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify .env.local has correct values"
echo "   2. Start your dev server: npm run dev"
echo "   3. Test the integration: curl http://localhost:3000/api/vertex-ai/test"
echo ""
echo "🔐 Your credentials are saved in: $KEY_FILE"
echo "   Keep this file secure and never commit it to git!"
echo ""
