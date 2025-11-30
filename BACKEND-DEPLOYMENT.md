# Backend Deployment Guide

This guide covers deploying your Express/Node.js backend to hosting platforms.

## 🚀 Deployment Options

### Option 1: Render.com (Recommended - Free Tier Available)

#### Prerequisites

- GitHub account
- Render.com account (free)

#### Steps

1. **Push server code to GitHub**

   ```bash
   cd /Users/destinyreynolds/Desktop/LR

   # Create a new repo on GitHub for just the backend
   # Then push the server folder
   git init
   git add server/
   git commit -m "Backend server for deployment"
   git remote add origin https://github.com/YOUR_USERNAME/lr-backend.git
   git push -u origin main
   ```

2. **Deploy on Render**

   - Go to [render.com](https://render.com) and sign in
   - Click **New +** → **Web Service**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `lr-backend-api`
     - **Root Directory**: `server`
     - **Environment**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Add Environment Variables**
   In Render dashboard, add these:

   - `SUPABASE_URL` = `https://eajlufywoqxtvamgdtcu.supabase.co`
   - `SUPABASE_ANON_KEY` = (your anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)
   - `PORT` = `8080`
   - `NODE_ENV` = `production`

4. **Deploy**
   - Click **Create Web Service**
   - Render will build and deploy automatically
   - Your API will be at: `https://lr-backend-api.onrender.com`

---

### Option 2: Railway.app (Also Free Tier)

#### Steps

1. **Push server code to GitHub** (same as above)

2. **Deploy on Railway**

   - Go to [railway.app](https://railway.app) and sign in
   - Click **New Project** → **Deploy from GitHub repo**
   - Select your backend repository
   - Railway will auto-detect Node.js

3. **Configure Root Directory**

   - In Settings → **Root Directory**: `server`

4. **Add Environment Variables**
   In Variables tab, add:

   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PORT` = `8080`
   - `NODE_ENV` = `production`

5. **Deploy**
   - Railway deploys automatically
   - Your API will be at: `https://your-app.railway.app`

---

### Option 3: Heroku (Paid)

#### Steps

1. **Install Heroku CLI**

   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Login and Create App**

   ```bash
   heroku login
   heroku create lr-backend-api
   ```

3. **Set Environment Variables**

   ```bash
   heroku config:set SUPABASE_URL=https://eajlufywoqxtvamgdtcu.supabase.co
   heroku config:set SUPABASE_ANON_KEY=your_anon_key
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   heroku config:set NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   cd server
   git init
   heroku git:remote -a lr-backend-api
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

---

## 📝 After Deployment

### 1. Update Frontend Configuration

Create `.env.production` in the root project:

```env
VITE_SUPABASE_URL=https://eajlufywoqxtvamgdtcu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SERVER_URL=https://your-backend-url.onrender.com
```

### 2. Update CORS in Server

Edit `server/src/index.ts`:

```typescript
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://YOUR_USERNAME.github.io",
    ],
    credentials: true,
  })
);
```

Then rebuild and redeploy:

```bash
cd server
npm run build
git add .
git commit -m "Update CORS"
git push
```

### 3. Test Backend

```bash
# Health check
curl https://your-backend-url.onrender.com/api/health

# Should return: {"ok":true}
```

### 4. Deploy Frontend to GitHub Pages

Update `package.json` homepage and push to GitHub (see DEPLOYMENT.md).

---

## 🔧 Troubleshooting

### Build fails

- Check Node version (should be 18+)
- Verify all dependencies are in `package.json` (not just devDependencies)
- Check build logs for specific errors

### Server crashes on start

- Check environment variables are set correctly
- Verify `SUPABASE_SERVICE_ROLE_KEY` is present
- Check logs for specific error messages

### CORS errors

- Ensure frontend URL is in CORS whitelist
- Include `https://` protocol in origin list
- Redeploy after CORS changes

### API calls fail from frontend

- Verify `VITE_SERVER_URL` in `.env.production`
- Check network tab in browser DevTools
- Ensure backend is running (visit `/api/health`)

---

## 📊 Monitoring

### Render.com

- View logs in Render dashboard → Your Service → Logs
- Check health: Events tab shows service status

### Railway.app

- View logs in Deployments → Click on deployment
- Check metrics in Metrics tab

---

## 💰 Cost Considerations

### Free Tiers

**Render.com Free:**

- 750 hours/month
- Spins down after 15 min inactivity
- First request after spin-down takes ~30 seconds

**Railway.app Free:**

- $5/month free credits
- No spin-down
- Good for light usage

### Paid Options

**Render Starter:** $7/month

- Always on
- No spin-down

**Railway Pro:** $20/month

- Includes $20 credits
- Better for consistent traffic

---

## 🔐 Security Checklist

- ✅ Never commit `.env` file
- ✅ Use environment variables for all secrets
- ✅ Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only
- ✅ Enable HTTPS (automatic on Render/Railway)
- ✅ Restrict CORS to your domains only
- ✅ Consider rate limiting for production

---

## 📦 Files Created for Deployment

- ✅ `render.yaml` - Render.com configuration
- ✅ `railway.json` - Railway.app configuration
- ✅ Updated `package.json` - Added postinstall script
- ✅ `BACKEND-DEPLOYMENT.md` - This file

---

## Quick Deploy Checklist

- [ ] Push server code to GitHub
- [ ] Create service on Render/Railway
- [ ] Add environment variables
- [ ] Deploy and test `/api/health`
- [ ] Update frontend `.env.production` with backend URL
- [ ] Update CORS in server code
- [ ] Redeploy backend
- [ ] Deploy frontend to GitHub Pages
- [ ] Test full flow end-to-end

Your backend will be live at:

- Render: `https://lr-backend-api.onrender.com`
- Railway: `https://your-app.railway.app`
