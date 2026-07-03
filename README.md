# SleekLink — Enterprise-Grade URL Shortener & Analytics Dashboard

SleekLink is a high-performance, developer-ready, full-stack URL shortener application featuring a glassmorphic user interface, real-time analytics, dynamic QR codes, client-side registry search, and active link controls (pause/resume). 

🔗 **Live Deployed Demo**: [https://sleeklink.shivansh.online](https://sleeklink.shivansh.online)

Built with scalability and modern design standards in mind, this project showcases full-stack capabilities, caching design patterns, timezone-aware analytics, and clean UI engineering.

---

## 📂 Project Directory Structure

```text
url-shortener/
├── .env                  # Backend environment configurations
├── .env.example          # Sample backend configuration template
├── package.json          # Node.js backend dependencies and script configuration
├── migrate.js            # Database schema migration script (runs once)
├── src/
│   ├── config/
│   │   ├── db.js         # PostgreSQL client connection pooling
│   │   └── redis.js      # Redis connection client initialization
│   ├── controllers/
│   │   └── urlController.js # API endpoints logic & redirection checks
│   ├── middleware/
│   │   └── rateLimiter.js   # Custom rate limiting logic (preventing abuse)
│   ├── routes/
│   │   └── urlRoutes.js  # Routing map for shortener operations
│   ├── services/
│   │   └── urlService.js # Database CRUD service layer (Base62 generator)
│   └── utils/
│       ├── base62.js     # Base62 encoding utility for short codes
│       └── uaParser.js   # Dependency-free User-Agent parsing logic
└── frontend/
    ├── .env              # Frontend configuration properties
    ├── .env.example      # Sample client environment template
    ├── package.json      # Client package dependencies
    ├── index.html        # Vite entry template
    ├── src/
    │   ├── App.jsx       # Registry table & creation dashboard controller
    │   ├── main.jsx      # React DOM entry point
    │   ├── index.css     # Glassmorphic styles, custom grids, CSS transitions
    │   └── components/
    │       └── AnalyticsCharts.jsx # Custom SVG Area chart and progress grids
```

---

## 🚀 Key Features

* **⚡ Redis REDIRECT Caching**: High-frequency redirections are cached inside Redis for sub-millisecond lookups. 
* **⏸️ Active/Pause Toggle Controls**: Users can temporarily deactivate any link directly from the registry table. Pausing a link immediately invalidates its key inside the Redis cache to ensure deactivation takes effect instantly.
* **📊 Rich Visitor Analytics**: Tracks total clicks, click volumes over the last 7 days (via a timezone-aware SVG timeline chart), device types (Desktop, Mobile, Tablet), browser names, operating systems, and traffic referrers.
* **📷 Dynamic QR Code Generator**: Generates and displays a unique, scanable QR code inside the analytics panel for every link, complete with a native browser file downloader.
* **🔍 Real-Time Dashboard Filter**: Interactive client-side search bar filters the registry table by original destination URL or short code instantly without stressing the database.
* **⏳ Expiration Date & Time Validation**: Enforces expiration constraints, disabling past times in the UI date picker and double-checking submissions on both the frontend and backend.
* **💅 Ambient Glassmorphic Design**: Clean responsive layout featuring blurred glass cards, vibrant glow blobs, interactive list-item hover borders, and smooth CSS transitions.

---

## 🛠️ Architecture & Core System Design

### Redirection & Caching Lifecycle
To keep redirects incredibly fast and prevent SQL connection starvation under high traffic volumes, the redirection route utilizes a write-through caching pattern with Redis.

```mermaid
graph TD
    A[Visitor Accesses /:shortCode] --> B{Exists in Redis Cache?}
    B -- Yes (Cache HIT) --> C[Parse User-Agent & Referrer]
    C --> D[Insert click entry to PostgreSQL asynchronously]
    D --> E[Redirect to Destination URL]
    
    B -- No (Cache MISS) --> F[Query PostgreSQL: check original_url, is_active, expires_at]
    F --> G{Link Exists?}
    G -- No --> H[Return 404 Not Found]
    G -- Yes --> I{Is Active?}
    I -- No (Paused) --> J[Render Glassmorphic 403 Paused Screen]
    I -- Yes --> K{Is Expired?}
    K -- Yes --> L[Return 410 Link Expired]
    K -- No --> M[Store URL in Redis with 1 Hour TTL]
    M --> C
```

* **Instant Cache Invalidation**: When a user clicks the **Active/Pause** toggle, the server sends an SQL update to PostgreSQL and immediately calls `client.del(shortCode)` on Redis. This ensures that visitors are instantly blocked by the 403 paused screen on their next click, preventing stale cache access.

### Client-Side Timezone Resolution
Database timestamps are stored in standard UTC. However, visitors accessing links at 1:44 AM local time on July 4th are clicking at 8:14 PM UTC on July 3rd. Without timezone-aware grouping, the analytics graph would erroneously list the click under July 3rd.
* **Solution**: The React client fetches the browser's current IANA timezone (e.g. `Intl.DateTimeFormat().resolvedOptions().timeZone` -> `Asia/Kolkata`) and passes it to the backend as a query parameter (`?tz=Asia/Kolkata`).
* **SQL Parsing**: The PostgreSQL server offsets the timestamps using the `AT TIME ZONE` operators prior to daily date grouping:
  ```sql
  SELECT TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE $2, 'YYYY-MM-DD') as click_date, COUNT(*) as count 
  FROM clicks 
  WHERE short_code = $1 
  GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE $2, 'YYYY-MM-DD')
  ```

### Dependency-Free User-Agent Parser
To keep the node modules compact and avoid React 19 package installer conflicts, the project implements a custom parser (`src/utils/uaParser.js`) that uses optimized regex checks to extract:
* **Device**: Mobile, Tablet, Desktop
* **OS**: iOS, Android, macOS, Windows, Linux
* **Browser**: Chrome, Safari, Firefox, Edge, Opera, IE

---

## 🗄️ Database Schema

The database consists of two tables linked by the `short_code` field:

### 1. `urls` Table
```sql
CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### 2. `clicks` Table
```sql
CREATE TABLE clicks (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    browser VARCHAR(50),
    os VARCHAR(50),
    device VARCHAR(50),
    referrer TEXT
);
```

---

## 🔌 API Endpoints Reference

### 1. Shorten Link
* **Method**: `POST /shorten`
* **JSON Body**:
  ```json
  {
    "url": "https://github.com/google",
    "customAlias": "goog-repo",      // Optional
    "expiresAt": "2026-07-06T15:30:00"  // Optional (Must be a future timestamp)
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "shortUrl": "http://localhost:5000/goog-repo"
  }
  ```

### 2. Fetch URLs
* **Method**: `GET /urls`
* **Response**: Returns a JSON array of all created shortened links.

### 3. Redirection Handler
* **Method**: `GET /:shortCode`
* **Behavior**: Redirects active links, serving 403 HTML page if paused, or 410 text if expired. Logs visitor data in the background.

### 4. Toggle Link Status
* **Method**: `PATCH /toggle-active/:shortCode`
* **Response (`200 OK`)**:
  ```json
  {
    "message": "Link paused successfully",
    "is_active": false
  }
  ```

### 5. Fetch Analytics
* **Method**: `GET /analytics/:shortCode`
* **Query Params**: `tz` (e.g. `tz=Asia/Kolkata`)
* **Response (`200 OK`)**:
  ```json
  {
    "shortCode": "goog-repo",
    "totalClicks": 24,
    "devices": [{"device": "Desktop", "count": 20}, {"device": "Mobile", "count": 4}],
    "browsers": [{"browser": "Chrome", "count": 18}, {"browser": "Safari", "count": 6}],
    "os": [{"os": "Windows", "count": 14}, {"os": "macOS", "count": 10}],
    "referrers": [{"referrer": "Direct", "count": 18}, {"referrer": "https://t.co/", "count": 6}],
    "timeline": [{"click_date": "2026-07-04", "count": 12}, {"click_date": "2026-07-03", "count": 12}]
  }
  ```

### 6. Delete Link
* **Method**: `DELETE /delete/:shortCode`
* **Response (`200 OK`)**: `{"message": "Deleted successfully"}`

---

## 🧪 Testing the API via Curl

### Create Link
```bash
curl -X POST http://localhost:5000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com","customAlias":"google-main"}'
```

### Fetch Analytics (with local Timezone)
```bash
curl "http://localhost:5000/analytics/google-main?tz=Asia/Kolkata"
```

### Toggle Active Status
```bash
curl -X PATCH http://localhost:5000/toggle-active/google-main
```

---

## 🏃 Local Setup Instructions

## 🏃 Detailed Installation & Local Setup Guide

Follow these step-by-step instructions to get the backend server and frontend client running on your machine:

### 1. Prerequisite Installations

#### A. PostgreSQL Database
1. Download and install **PostgreSQL** from the [official website](https://www.postgresql.org/download/).
2. Open **pgAdmin** or the terminal command line tool (**psql**) and create a database named `url_shortener`:
   ```sql
   CREATE DATABASE url_shortener;
   ```
3. Keep your database credentials (username, password, port, host) handy.

#### B. Redis Cache Server (Windows Specific Setup)
Since native Redis is officially unsupported on Windows, use one of the following methods to run Redis locally:
* **Option A (WSL - Recommended)**: Install WSL (Windows Subsystem for Linux), run Ubuntu, and install/start Redis:
  ```bash
  sudo apt-get update
  sudo apt-get install redis-server
  sudo service redis-server start
  ```
* **Option B (Docker)**: Run Redis in a lightweight Docker container:
  ```bash
  docker run -d --name local-redis -p 6379:6379 redis
  ```
* **Option C (Memurai)**: Install [Memurai](https://www.memurai.com/), a developer-friendly Redis-compatible caching engine for Windows.

### 2. Configure Environment Variables

1. Create a file named `.env` in the **root (backend)** directory:
   ```env
   # Application Port
   PORT=5000

   # Redirection Base URL prefix
   BASE_URL=http://localhost:5000

   # Frontend Client URL (for CORS validation)
   FRONTEND_URL=http://localhost:5173

   # PostgreSQL Credentials
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=url_shortener
   DB_PASSWORD=your_postgres_password
   DB_PORT=5432

   # (Optional) Unified connection string for cloud providers (e.g. Neon, Render)
   # DATABASE_URL=postgresql://postgres:password@localhost:5432/url_shortener
   ```
2. Create a file named `.env` inside the **frontend** directory:
   ```env
   # API endpoint address of your backend server
   VITE_API_URL=http://localhost:5000
   ```

### 3. Initialize Database Schemas (Migration)

The application includes an automated migration script `migrate.js` that establishes the required PostgreSQL tables:
```bash
# In the root project directory, run:
node migrate.js
```
*This script will connect to your PostgreSQL database and create the `urls` and `clicks` tables automatically if they do not exist.*

### 4. Build & Launch Backend API Server
```bash
# In the root project directory, run:
npm install
npm run dev
```
*The server will start listening on http://localhost:5000. It logs a confirmation if the connections to PostgreSQL and Redis are successful.*

### 5. Build & Launch Frontend Dashboard
```bash
# Open a new terminal window, navigate to the frontend folder, and run:
cd frontend
npm install
npm run dev
```
*The Vite development server will spin up on http://localhost:5173.*

Open your web browser and navigate to **http://localhost:5173** to access the SleekLink Premium URL Shortener dashboard!