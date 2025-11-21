# GitHub Pages Deployment Guide

This repository is configured for deployment to GitHub Pages.

## Prerequisites

- A new GitHub repository for hosting (separate from your main repo)
- Your Supabase credentials

## Setup Instructions

### 1. Update Configuration

Edit `package.json` and replace:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME"
```

With your actual GitHub username and repository name. For example:
```json
"homepage": "https://qualaces.github.io/lr-demo"
```

### 2. Update Vite Config Base Path

Edit `vite.config.ts` line 10:
```typescript
base: '/YOUR_REPO_NAME/', // Must match your repo name
```

For example, if your repo is `lr-demo`:
```typescript
base: '/lr-demo/',
```

### 3. Create GitHub Repository

```bash
# On GitHub, create a new repository (e.g., "lr-demo")
# DO NOT initialize it with README, .gitignore, or license
```

### 4. Add GitHub Secrets

In your GitHub repository settings, add these secrets:
- Go to Settings → Secrets and variables → Actions → New repository secret
- Add:
  - Name: `VITE_SUPABASE_URL`, Value: Your Supabase URL
  - Name: `VITE_SUPABASE_ANON_KEY`, Value: Your Supabase anon key

### 5. Enable GitHub Pages

1. Go to Settings → Pages
2. Under "Build and deployment":
   - Source: **GitHub Actions** (not "Deploy from a branch")

### 6. Deploy

#### Method 1: Using GitHub Actions (Recommended)

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit for GitHub Pages"

# Add your new repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

The GitHub Action will automatically build and deploy on push.

#### Method 2: Manual Deploy with gh-pages

```bash
# Install gh-pages package
npm install --save-dev gh-pages

# Deploy
npm run deploy
```

This will:
1. Build your app (`npm run build`)
2. Push the `build` folder to the `gh-pages` branch
3. GitHub Pages will serve from that branch

## Testing Locally

Before deploying, test the production build:

```bash
# Build the app
npm run build

# Preview the build
npm run preview
```

Visit `http://localhost:4173` to test.

## Important Notes

### API Calls

Your app makes API calls to `http://localhost:8080`. For production:

1. **Option A: Deploy backend separately**
   - Deploy your Node.js backend to a service (Heroku, Railway, Render, etc.)
   - Update `.env` with production backend URL:
     ```
     VITE_SERVER_URL=https://your-backend.herokuapp.com
     ```

2. **Option B: Use Supabase directly**
   - Remove backend dependency
   - Call Supabase directly from frontend (already configured)

### Environment Variables

Create `.env.production` for production settings:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SERVER_URL=https://your-backend-url.com
```

### CORS Issues

If you deploy the backend separately, ensure CORS is configured:
```typescript
// In server/src/index.ts
app.use(cors({
  origin: ['https://YOUR_USERNAME.github.io'],
  credentials: true
}));
```

## Troubleshooting

### Blank page after deployment
- Check browser console for errors
- Verify `base` in `vite.config.ts` matches your repo name
- Check that GitHub Pages is enabled and set to "GitHub Actions"

### 404 errors for assets
- Make sure `base` path includes leading and trailing slashes: `/repo-name/`

### API calls failing
- Deploy backend or update to use Supabase directly
- Check CORS settings on backend

## Files Modified for Deployment

- ✅ `package.json` - Added deploy scripts and homepage
- ✅ `vite.config.ts` - Already has `base: '/lr-demo/'`
- ✅ `.github/workflows/deploy.yml` - GitHub Actions workflow
- ✅ `DEPLOYMENT.md` - This file

## Quick Deploy Commands

```bash
# Build and test locally
npm run build
npm run preview

# Deploy using gh-pages
npm run deploy

# Or push to trigger GitHub Actions
git add .
git commit -m "Deploy to GitHub Pages"
git push
```

Your site will be available at:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
