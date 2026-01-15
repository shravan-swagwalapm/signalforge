# SignalForge 🔥

**Stop guessing what to post. Start betting on ideas that win.**

SignalForge is a content discovery tool that scans Reddit, X, and LinkedIn to find viral content in your niche. Get explainable virality scores and narrative clusters to fuel your next post.

## ✨ Features

- **Multi-platform discovery**: Scans Reddit, X (Twitter), and LinkedIn
- **APIs + Scraping fallback**: Always tries official APIs first, falls back to scraping
- **Explainable virality scores**: Every score (0-100) comes with clear reasons
- **Narrative clusters**: Posts organized by theme angles (How-to, Trends, Challenges, etc.)
- **Trial gating**: 3 free runs per month (paywall-ready architecture)
- **Google OAuth**: Quick sign-in with Google

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd signalforge
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:

```bash
# Copy contents of supabase/migrations/001_initial_schema.sql
# Paste into Supabase SQL Editor and run
```

3. Enable Google OAuth:
   - Go to **Authentication** → **Providers** → **Google**
   - Enable and add your Google OAuth credentials
   - Add redirect URL: `http://localhost:3000/api/auth/callback`

4. Get your API keys from **Settings** → **API**

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (for better X results)
X_BEARER_TOKEN=your-x-api-token
```

### 4. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Platform Setup

### Reddit

**No API key required** - Uses Reddit's public JSON API.

The connector:
1. Fetches from relevant subreddits
2. Searches by query
3. Falls back to scraping old.reddit.com if needed

### X (Twitter)

**API key optional but recommended**.

Without API key:
- Falls back to Nitter instances (may be unreliable)

With API key:
1. Get Bearer Token from [developer.twitter.com](https://developer.twitter.com)
2. Add to `.env.local`: `X_BEARER_TOKEN=your-token`

### LinkedIn

**Limited in MVP** - LinkedIn aggressively blocks scraping.

Current implementation:
- Stores user's LinkedIn profile URL for context
- Scraping scaffold exists but disabled by default
- Enable experimental scraping: `ENABLE_LINKEDIN_SCRAPING=true`

## 📁 Project Structure

```
signalforge/
├── app/
│   ├── page.tsx              # Homepage
│   ├── login/page.tsx        # Auth page
│   ├── dashboard/page.tsx    # Main app
│   └── api/
│       ├── run/route.ts      # Discovery endpoint
│       └── subscribe/route.ts # Payment stub
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── gating.ts             # Trial enforcement
│   ├── scoring.ts            # Virality algorithm
│   ├── theme.ts              # Theme expansion
│   └── types.ts              # TypeScript types
├── connectors/
│   ├── base.ts               # Connector interface
│   ├── reddit.ts             # Reddit connector
│   ├── x.ts                  # X connector
│   ├── linkedin.ts           # LinkedIn connector
│   └── index.ts              # Orchestrator
└── supabase/
    └── migrations/           # DB schema
```

## 🎯 How API → Scraping Fallback Works

Each connector follows this pattern:

```typescript
async function fetch(queries: string[]): Promise<ConnectorResult> {
  // 1. Try API first
  try {
    const posts = await fetchViaAPI(queries);
    if (posts.length > 0) return { posts, source: 'api' };
  } catch (error) {
    console.log('API failed, trying scraping...');
  }
  
  // 2. Fallback to scraping
  try {
    const posts = await fetchViaScraping(queries);
    if (posts.length > 0) return { posts, source: 'scraping' };
  } catch (error) {
    console.log('Scraping also failed');
  }
  
  // 3. Return empty (don't burn user's attempt)
  return { posts: [], error: 'Both methods failed' };
}
```

**Key principle**: A discovery run only counts as "successful" (and burns a free attempt) if at least one platform returns at least one post.

## 📊 Virality Score Explained

The score (0-100) is calculated from four factors:

| Factor | Weight | What it measures |
|--------|--------|------------------|
| Engagement | 40% | Likes, comments, shares, upvotes |
| Authority | 25% | Author's follower count |
| Recency | 20% | How recently posted |
| Quality | 15% | Content signals (questions, lists, length) |

Each score includes "why" bullets explaining the top factors.

## 🔒 Trial Gating (Future Paywall)

The architecture supports paywall enforcement:

```typescript
// lib/gating.ts
const FREE_RUNS_PER_MONTH = 3;

// In /api/run:
const gating = await checkGating(supabase, userId);
if (!gating.allowed) {
  return { code: 'PAYWALL_REQUIRED', teaser: {...} };
}
```

To enable paywall:
1. Uncomment paywall check in `/api/run/route.ts`
2. Implement `/api/subscribe` with Stripe/Lemon Squeezy
3. Update subscription status in database

## 🛠 Development

```bash
# Run dev server
npm run dev

# Type check
npm run build

# Lint
npm run lint
```

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL for OAuth redirect |
| `X_BEARER_TOKEN` | No | X API bearer token |
| `ENABLE_LINKEDIN_SCRAPING` | No | Enable experimental LinkedIn scraping |
| `MAX_POSTS_PER_PLATFORM` | No | Max posts per platform (default: 10) |

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Other platforms

The app is a standard Next.js 14 app and can be deployed anywhere that supports Node.js.

## 📄 License

MIT

---

Built with ❤️ for creators who ship.
