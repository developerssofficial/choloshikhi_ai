# Xparrow AI Chatbot - Complete Documentation

## Project Overview

Xparrow AI is a secure, production-ready AI chatbot powered by **Gemini** and **MIMO** APIs. It features a premium dark UI, intelligent model routing, conversation memory, response caching, and automatic API fallback with retry logic.

**Architecture:** Frontend (React) + Backend (Express.js) with API keys stored exclusively server-side.

---

## Features

| Feature | Description |
|---------|-------------|
| Dual API Support | Gemini (Google) and MIMO (Xiaomi) |
| Intelligent Model Routing | Auto-routes based on question complexity |
| API Fallback | Gemini fails → MIMO fallback, with retry |
| Dual Gemini Keys | Automatic key switching on rate limit |
| Conversation Memory | 40 prompts (80 messages) context window |
| Prompt Cache | 100 entries, 24-hour TTL, LRU eviction |
| Rate Limiting | 60 requests per 15 minutes per IP |
| Input Validation | Message length, type, history limits |
| Request Timeout | 30-second timeout on all API calls |
| Sensitive Data Protection | API keys/passwords filtered from memory |
| Dark Premium UI | Glassmorphism, animations, particles |
| User Model Selection | Auto/Gemini/MIMO manual override |
| Clear Data Options | Clear chat, clear memory, delete all |

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite 6 (build tool)
- Tailwind CSS 3 (styling)
- React Router v7 (routing)
- localStorage (data persistence)

### Backend
- Express.js 4
- TypeScript
- dotenv (environment variables)
- express-rate-limit (rate limiting)
- tsx (TypeScript execution)

---

## Architecture

```
┌─────────────────────────────────────┐
│           Frontend (React)          │
│  ┌─────────┐ ┌──────────────────┐  │
│  │  Chat UI │ │ MemorySystem     │  │
│  │  Router  │ │ PromptCache      │  │
│  │  Animations│ │ ModelRouter    │  │
│  └────┬────┘ └──────────────────┘  │
│       │ POST /api/chat              │
└───────┼─────────────────────────────┘
        │ (Vite proxy in dev)
┌───────┼─────────────────────────────┐
│       ▼    Backend (Express.js)     │
│  ┌──────────────────────────────┐   │
│  │ /api/chat (POST)             │   │
│  │  - Rate Limiting             │   │
│  │  - Input Validation          │   │
│  │  - Timeout (30s)             │   │
│  └──────────┬───────────────────┘   │
│             │                       │
│  ┌──────────▼───────────────────┐   │
│  │ Provider Service             │   │
│  │  - Gemini (2 keys, fallback) │   │
│  │  - MIMO                      │   │
│  │  - Retry (3x, exp. backoff)  │   │
│  │  - Cross-provider fallback   │   │
│  └──────────────────────────────┘   │
│                                     │
│  .env (API keys - SERVER ONLY)      │
└─────────────────────────────────────┘
```

---

## Environment Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd server && npm install && cd ..

# 3. Configure environment
cp .env.example .env
# Edit .env with your actual API keys

# 4. Start development (both servers)
npm run dev
```

### Individual Commands

```bash
# Frontend only (port 5173)
npm run dev:client

# Backend only (port 3001)
npm run dev:server

# Production build
npm run build
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_key_here
GEMINI_API_KEY_FALLBACK=your_gemini_fallback_key_here
MIMO_API_KEY=your_mimo_key_here
PORT=3001
NODE_ENV=development
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Primary Gemini API key |
| `GEMINI_API_KEY_FALLBACK` | No | Fallback Gemini key (used on rate limit) |
| `MIMO_API_KEY` | Yes | MIMO API key |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (default: development) |

**SECURITY: `.env` is gitignored and must NEVER be committed to version control.**

---

## API Endpoints

### POST /api/chat

Main chat endpoint. Sends a message and receives an AI response.

**Request:**
```json
{
  "message": "Hello, how are you?",
  "history": [
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hello! How can I help?"}
  ],
  "model": "auto"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User message (max 10,000 chars) |
| `history` | array | No | Previous messages for context (max 50) |
| `model` | string | No | "auto", "gemini", or "mimo" (default: "auto") |

**Response (success):**
```json
{
  "success": true,
  "message": "AI response text here",
  "model": "gemini",
  "cached": false
}
```

**Response (error):**
```json
{
  "success": false,
  "message": "User-friendly error message"
}
```

### GET /api/chat/health

Health check endpoint. Returns provider status.

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "providers": {
    "gemini": true,
    "geminiKeysCount": 2,
    "mimo": true
  },
  "timestamp": "2026-08-07T12:00:00.000Z"
}
```

---

## Model Routing Logic

The model router scores questions based on multiple factors:

### Factors (score contribution)
| Factor | Score | Description |
|--------|-------|-------------|
| Length > 200 chars | +30 | Long questions |
| Word count > 50 | +20 | Many words |
| Complex keywords | +40 | "explain in detail", "বিস্তারিত", etc. |
| Code request | +25 | "code", "programming", "function" |
| Essay request | +35 | "essay", "story", "write a poem" |
| Simple keywords | -30 | "hi", "hello", "ধন্যবাদ", etc. |

### Routing Decision
- **Score >= 30** → MIMO (better for complex/long responses)
- **Score < 30** → Gemini (faster for simple questions)

### User Override
Users can manually select: **Auto** (default) | **Gemini** | **MIMO**

---

## Memory System

### Behavior
- Stores up to **40 prompts** (80 messages total)
- Extracts key points from last 20 messages
- Generates conversation summary for context
- Data persisted in localStorage

### Data Protection
- API keys, passwords, tokens are automatically **redacted** before storage
- Sensitive patterns detected: Gemini keys (`AIza...`), MIMO keys (`sk-...`), Bearer tokens, password assignments

### Clear Options
- **Clear Chat**: Removes chat messages only
- **Clear Memory**: Removes AI memory context only
- **Delete All Data**: Clears chat history, memory, and cache

---

## Cache System

### Behavior
- Maximum **100 entries**
- **24-hour TTL** (entries expire after 24 hours)
- **LRU eviction** when cache is full
- Cache key: `model + normalized prompt`

### Statistics
- Tracks hits, misses, and hit rate
- Stats displayed in UI (every 5 seconds update)
- Sensitive prompts are not logged

---

## Error Handling

### Error Types & Messages
| Scenario | User Message |
|----------|-------------|
| Empty message | "Message is required and must be a string." |
| Message too long | "Message is too long. Maximum 10,000 characters allowed." |
| Invalid model | "Invalid model. Must be one of: gemini, mimo, auto" |
| Rate limited | "All API providers are rate-limited. Please try again in a few minutes." |
| Invalid API key | "API authentication failed. Please check your configuration." |
| Timeout | "Request timed out. The server may be busy. Please try again." |
| Network error | "Failed to fetch" (browser native) |
| All providers fail | "All API providers failed. Please try again later." |

### Retry Logic
- **Max retries**: 3 per provider
- **Backoff**: Exponential (1s, 2s, 4s)
- **Cross-provider fallback**: Gemini → MIMO (and vice versa)
- **Invalid key**: Not retried with same key
- **Retry button**: Available on error for user-initiated retry

---

## Security Rules

### API Key Management
1. API keys are stored **only** in server-side `.env` file
2. Frontend **never** sees or handles API keys
3. `.env` is **gitignored** - never committed to version control
4. No API keys in console logs, localStorage, or frontend code
5. No "encrypted storage" claims for localStorage

### Input Validation
1. Message required and must be string
2. Maximum 10,000 characters per message
3. History limited to 50 messages
4. Model must be one of: gemini, mimo, auto
5. Request body limited to 100KB

### Rate Limiting
- 60 requests per 15 minutes per IP
- Applied to POST /api/chat only
- Health check not rate-limited

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

### Request Timeout
- 30-second timeout on all API calls (both frontend and backend)

---

## Testing Guide

### Manual Test Cases

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Send "hi" | Quick Gemini response |
| 2 | Send long question (>200 chars) | Auto-routes to MIMO |
| 3 | Send code request | Routes to MIMO |
| 4 | Send empty message | 400 error: "Message is required" |
| 5 | Send >10,000 chars | 400 error: "Message is too long" |
| 6 | 61st request in 15 min | Rate limited |
| 7 | Disable Gemini key | Fallback to MIMO |
| 8 | Disable both keys | User-friendly error |
| 9 | Send same message twice | Cache hit (faster response) |
| 10 | Wait 24 hours | Cache expires, fresh request |
| 11 | Send 41st prompt | Oldest prompt removed |
| 12 | Click "Clear Chat" | Messages cleared |
| 13 | Click "Clear Memory" | Memory cleared |
| 14 | Click "Delete All Data" | Everything cleared |
| 15 | Check mobile UI | Responsive layout |

### API Test Commands

```bash
# Health check
curl http://localhost:3001/api/chat/health

# Simple message
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","history":[],"model":"gemini"}'

# Empty message (should fail)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"","history":[],"model":"gemini"}'

# Invalid model (should fail)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","history":[],"model":"invalid"}'
```

---

## Known Limitations

1. **localStorage only**: Data is browser-local, not synced across devices
2. **Single-user**: No user authentication system
3. **No streaming**: Responses are returned as complete messages
4. **Memory is session-based**: Memory resets when page is reloaded (sessionId changes)
5. **Cache is frontend-only**: Not shared between browser tabs
6. **Rate limit is per-IP**: Behind shared proxies, all users share limits
7. **No persistent history**: Chat history is lost if localStorage is cleared

---

## Deployment Guide

### Production Build

```bash
# Build frontend
npm run build

# The built files will be in dist/
```

### Server Deployment

```bash
# On the server:
cd server
npm install --production
# Ensure .env file exists with production keys
npm start
```

### Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong, unique API keys
- [ ] Set up HTTPS (reverse proxy: nginx, caddy)
- [ ] Configure CORS for your domain only
- [ ] Set up monitoring/logging
- [ ] Configure rate limiting appropriately
- [ ] Set up automated backups if needed
- [ ] Remove any console.log statements
- [ ] Verify `.env` is not in version control
- [ ] Test all API endpoints
- [ ] Verify error handling in production

### Recommended: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

---

## File Structure

```
xparrow-ai/
├── .env                    # API keys (gitignored)
├── .env.example            # Template for .env
├── .gitignore              # Git ignore rules
├── index.html              # HTML entry point
├── package.json            # Frontend dependencies
├── vite.config.ts          # Vite config with API proxy
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind CSS config
│
├── server/                 # Backend server
│   ├── package.json        # Server dependencies
│   ├── tsconfig.json       # Server TypeScript config
│   └── src/
│       ├── index.ts        # Express server entry
│       ├── config/
│       │   └── env.ts      # Environment config
│       ├── middleware.ts    # Rate limit, validation, timeout
│       ├── routes/
│       │   └── chat.ts     # /api/chat route
│       └── services/
│           └── providers.ts # Gemini & MIMO API handlers
│
├── src/                    # Frontend source
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Router setup
│   ├── index.css           # Tailwind + animations
│   ├── pages/
│   │   ├── Home.tsx        # Landing page
│   │   └── Chat.tsx        # Chat interface
│   ├── components/
│   │   ├── Animations.tsx  # Animation components
│   │   ├── MemoryStats.tsx # Memory usage display
│   │   └── Empty.tsx       # Empty state
│   ├── services/
│   │   ├── MemorySystem.ts # Conversation memory
│   │   ├── PromptCache.ts  # Response caching
│   │   └── ModelRouter.ts  # Intelligent routing
│   ├── hooks/
│   │   └── useTheme.ts     # Theme hook
│   └── lib/
│       └── utils.ts        # Utility functions
│
└── docs/
    └── DOCUMENTATION.md    # This file
```

---

## Assumptions

1. Backend server runs on port 3001, frontend dev server on port 5173
2. Vite dev proxy forwards `/api/*` to the backend
3. In production, a reverse proxy (nginx) serves both frontend and backend
4. Users access the app from a single browser (localStorage is browser-local)
5. API keys are provided by the user/admin and are valid
6. The app is single-user (no authentication system)
