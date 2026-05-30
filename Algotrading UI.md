# AlgoTrading App
https://github.com/bhuvan-advantix/AlgoTrading

https://drive.google.com/drive/folders/1MHYSCzr6kXlFxxo2URiLcDUowz9UFom-?usp=sharing
This is a comprehensive algorithmic trading application with a React frontend and two Node.js backends.

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

### Zerodha API Key Setup Documentation

**Project Files:**
All source code, configurations, and supporting files are available in the Google Drive folder:

[Project Source Code Repository](https://drive.google.com/drive/folders/1MHYSCzr6kXlFxxo2URiLcDUowz9UFom-?usp=sharing&utm_source=chatgpt.com)

### Objective

Generate a new Zerodha Kite Connect API Key and link the required subscription for the Pulse915 Algo Trading application.

### Prerequisites

* Active Zerodha trading account
* Zerodha Client ID: **TDM399**
* Kite Connect subscription

### Steps to Create API Key

1. Log in to the Kite Connect Developer Portal:

   [Kite Connect Developer Portal](https://developers.kite.trade/login?utm_source=chatgpt.com)

2. If an old API key exists, delete it.

3. Create a new application using the following details:

| Field             | Value                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Type              | Connect                                                                                                                   |
| App Name          | Pulse915                                                                                                                  |
| Zerodha Client ID | TDM399                                                                                                                    |
| Redirect URL      | [https://advantix-algotrading.netlify.app](https://advantix-algotrading.netlify.app)                                      |
| Postback URL      | Leave Empty                                                                                                               |
| Description       | Internal Kite Connect application for downloading market data and candlestick data for analysis and personal trading use. |

4. Complete the application creation process.

5. Link the Kite Connect subscription to the newly created application.

6. Copy and securely store:

   * API Key
   * API Secret

7. Update the application configuration with the newly generated credentials.

### Expected Outcome

After the new API Key is created and the subscription is linked, the Pulse915 application should be able to:

* Authenticate with Zerodha
* Download market data
* Fetch candlestick data
* Execute analysis workflows
* Support paper trading and live trading integrations

### Notes

* All project code required for integration is already available in the shared Google Drive folder.
* Postback URL is not required for the current implementation and should be left blank.
* It is recommended to generate a fresh API Key instead of reusing older credentials to avoid configuration issues.

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
