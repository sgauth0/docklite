# Vertex AI Setup Guide for DockLite

This guide will help you set up Vertex AI integration from scratch.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. Billing enabled on your GCP account (Vertex AI requires billing)

## Method 1: Service Account (RECOMMENDED)

This is the most secure and reliable method for production use.

### Step 1: Install and Initialize gcloud CLI

```bash
# Install gcloud (if not installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Initialize gcloud
gcloud init

# Login to your Google account
gcloud auth login
```

### Step 2: Create a New GCP Project

```bash
# Set your project ID (must be globally unique)
export PROJECT_ID="docklite-$(date +%s)"

# Create the project
gcloud projects create $PROJECT_ID --name="DockLite"

# Set as active project
gcloud config set project $PROJECT_ID

# Link billing account (REQUIRED - replace with your billing account ID)
# Find your billing account ID: gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### Step 3: Enable Required APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Compute Engine API (required by Vertex AI)
gcloud services enable compute.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

### Step 4: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create docklite-vertex \
    --display-name="DockLite Vertex AI Service Account" \
    --description="Service account for DockLite to access Vertex AI"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:docklite-vertex@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Grant Service Usage Consumer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:docklite-vertex@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/serviceusage.serviceUsageConsumer"
```

### Step 5: Create and Download Service Account Key

```bash
# Create credentials directory
mkdir -p gcp-credentials

# Generate key file
gcloud iam service-accounts keys create gcp-credentials/docklite-vertex-key.json \
    --iam-account=docklite-vertex@${PROJECT_ID}.iam.gserviceaccount.com

# Verify key was created
ls -lh gcp-credentials/docklite-vertex-key.json
```

### Step 6: Configure Environment Variables

Create a `.env.local` file in your DockLite directory:

```bash
# Copy from example
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

Add these values to `.env.local`:

```env
# Your GCP Project ID
GOOGLE_CLOUD_PROJECT=your-actual-project-id

# Vertex AI region
GOOGLE_CLOUD_LOCATION=us-central1

# Path to service account key
GOOGLE_APPLICATION_CREDENTIALS=./gcp-credentials/docklite-vertex-key.json
```

### Step 7: Secure Your Credentials

```bash
# Add credentials to .gitignore
echo "gcp-credentials/" >> .gitignore
echo ".env.local" >> .gitignore

# Set restrictive permissions
chmod 600 gcp-credentials/docklite-vertex-key.json
```

---

## Method 2: API Key (ALTERNATIVE - Has Limitations)

**⚠️ WARNING:** API keys have significant limitations with Vertex AI and are not recommended for production. Use Service Accounts instead.

### Step 1-3: Same as Method 1 (Create Project, Enable APIs)

### Step 4: Create API Key

```bash
# Create API key
gcloud alpha services api-keys create \
    --display-name="DockLite Vertex AI Key" \
    --api-target=service=aiplatform.googleapis.com

# List API keys to get the key string
gcloud alpha services api-keys list

# Get the actual key value
gcloud alpha services api-keys get-key-string <KEY-ID>
```

### Step 5: Add to Environment

```env
# In .env.local
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_API_KEY=your-api-key-here
```

---

## Common Issues and Solutions

### Error: "gcloud: command not found"
**Solution:** Install gcloud CLI from https://cloud.google.com/sdk/docs/install

### Error: "API [aiplatform.googleapis.com] not enabled"
**Solution:** Run `gcloud services enable aiplatform.googleapis.com`

### Error: "Project does not have billing enabled"
**Solution:**
1. Go to https://console.cloud.google.com/billing
2. Link a billing account to your project
3. Or use: `gcloud billing projects link PROJECT_ID --billing-account=BILLING_ACCOUNT_ID`

### Error: "Permission denied" when creating service account
**Solution:** Ensure you have Owner or Editor role on the project

### Error: "Quota exceeded"
**Solution:**
1. Check quotas: https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas
2. Request quota increase if needed
3. Free tier has limited quotas

---

## Testing Your Setup

After completing the setup, test the integration:

```bash
# Start your dev server
npm run dev

# Visit the test endpoint (we'll create this)
curl http://localhost:3000/api/vertex-ai/test
```

---

## Cost Considerations

Vertex AI charges based on:
- **Input tokens:** Text sent to the model
- **Output tokens:** Text generated by the model

**Approximate Pricing (as of 2024):**
- Gemini 1.5 Flash: $0.00001875/1K input tokens, $0.000075/1K output tokens
- Gemini 1.5 Pro: $0.00125/1K input tokens, $0.005/1K output tokens

**Free tier:** Limited free quota available

---

## Next Steps

1. ✅ Complete the setup above
2. ✅ Configure `.env.local` with your credentials
3. ✅ Test the API endpoint
4. Start building AI features into DockLite!

---

## Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)
