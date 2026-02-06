# Fantasy Map Generator

Procedural fantasy map generator with AI enhancement via Replicate.

## Deploy to Vercel

### 1. Push to GitHub

```bash
cd fantasy-map-app
git init
git add .
git commit -m "Initial commit"
gh repo create fantasy-map-generator --public --source=. --push
```

Or create a repo on github.com and push manually:
```bash
git remote add origin https://github.com/YOUR_USERNAME/fantasy-map-generator.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your personal account
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Framework Preset should auto-detect **Next.js**
5. No environment variables needed (API key is entered in the UI and passed per-request)
6. Click **Deploy**

### 3. Use

1. Open your deployed URL
2. Generate a procedural map using the sliders
3. Expand "AI Enhance" in the sidebar
4. Enter your Replicate API key (get one at [replicate.com](https://replicate.com))
5. Pick a style and click "✦ AI Enhance"
6. Wait ~20-30 seconds for the result

## How It Works

- **Frontend**: React procedural map generator using Perlin noise flood-fill growth
- **API Route** (`/api/enhance`): Proxies requests to Replicate's SDXL img2img model
- **API Route** (`/api/status`): Polls prediction status until complete
- The Replicate API key is passed from the browser per-request (not stored server-side)

## Tech Stack

- Next.js 14 (App Router)
- Replicate SDK (SDXL multi-controlnet-lora for img2img)
- Pure React + Canvas for procedural generation
