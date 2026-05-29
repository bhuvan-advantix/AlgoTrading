# AlgoTrading App

This is a comprehensive algorithmic trading application with a React frontend and two Node.js backends.

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

---

## 1. Frontend Setup

The frontend is built using React and Vite. It serves the user interface of the application.

**Path:** `/` (Root directory of the project)

**Installation:**
```bash
# Navigate to the root directory
cd path/to/AlgoTrading

# Install the necessary dependencies
npm install
```

**Run Command:**
```bash
# Start the Vite development server
npm run dev
```
*The frontend will typically run on `http://localhost:5173`*

---

## 2. Market Data Backend Setup

This backend is responsible for fetching and serving live market data (e.g., via Yahoo Finance) and handling proxy requests for paper trading.

**Path:** `/backend`

**Installation:**
```bash
# Navigate to the backend directory
cd backend

# Install the necessary dependencies
npm install
```

**Run Command:**
```bash
# Start the market data server
npm start
```
*This server will run on `http://localhost:8081`*

---

## 3. Main API Backend Setup (Zerodha/Kite)

This backend connects to Zerodha Kite, manages MongoDB operations, handles user authentication (Clerk integration config), and processes AI analyses.

**Path:** `/server`

**Installation:**
```bash
# Navigate to the main server directory
cd server

# Install the necessary dependencies
npm install
```

**Run Command:**
```bash
# Start the main API server
npm start
```
*This server will run on `http://localhost:5000`*

---

## Environment Variables

Make sure to configure your `.env` file in the root directory and inside the `/server` directory before running the application. Use the `.env.example` as a template and provide the required API keys (e.g., VITE_CLERK_PUBLISHABLE_KEY, MONGODB_URI, KITE_API_KEY). Never commit your real `.env` file to version control.
