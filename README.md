# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Environment Variables

Create a `.env.local` in the project root (do NOT commit it) using `.env.example` as a template. The client-side Vite app expects `VITE_` prefixed env vars in order to expose them to the browser.

Required variables (examples):

- VITE_CLERK_PUBLISHABLE_KEY: Your Clerk publishable key (place this in `.env.local`, do NOT commit it)
- PORT: server port (default 5000)
- MONGODB_URI: MongoDB connection string
- KITE_API_KEY / KITE_API_SECRET: Zerodha Kite API credentials (if using Zerodha integration)
- KITE_REDIRECT_URI: OAuth redirect for Kite
- TWELVEDATA_API_KEY: Market data API key (optional for local mocks)
- FINNHUB_API_KEY: News API key (optional; used for news fetch)
- GEMINI_API_KEY: Gemini / Google generative AI API key used for news analysis

Important Clerk note:

- Add your Clerk publishable key to `.env.local` like this:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
```

- Never commit real keys into the repo. Use placeholders in tracked files and keep `.env.local` out of version control.

Example:

```env
VITE_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/stockdb
TWELVEDATA_API_KEY=your_twelvedata_key
FINNHUB_API_KEY=your_finnhub_key
GEMINI_API_KEY=your_gemini_key
```

Security notes:

- Never commit `.env.local` or real API keys to your repo. Add `.env*` to `.gitignore`.
- Rotate API keys if they are ever exposed.

Quick start (server):

1. Copy `.env.example` to `.env.local` and fill values.
2. Install server dependencies and start:

```powershell
cd server
npm install
node server.js
```

If your project uses `npm run dev` or another script, use that instead.

