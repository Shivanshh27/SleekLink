const { createShortUrl } = require("../services/urlService");
const { pool } = require("../config/db");
const { client } = require("../config/redis");
const { parseUserAgent } = require("../utils/uaParser");

const shortenUrl = async (req, res) => {
  try {
    const { url, customAlias, expiresAt } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    const shortCode = await createShortUrl(url, customAlias, expiresAt);

    res.json({
      shortUrl: `${process.env.BASE_URL}/${shortCode}`,
    });
  } catch (err) {
    if (err.message === "Custom alias already taken") {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const redirectUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // 🔥 Check Redis
    let cachedUrl = null;

    if (client) {
      cachedUrl = await client.get(shortCode);
    }

    if (cachedUrl) {
      console.log("Cache HIT");

      // ✅ LOG CLICK ON CACHE HIT
      const userAgent = req.get("User-Agent") || "";
      const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      const referrer = req.headers["referer"] || req.headers["referrer"] || "Direct";
      const { browser, os, device } = parseUserAgent(userAgent);

      await pool.query(
        "INSERT INTO clicks (short_code, ip_address, user_agent, browser, os, device, referrer) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [shortCode, ipAddress, userAgent, browser, os, device, referrer]
      );

      return res.redirect(cachedUrl);
    }

    console.log("Cache MISS");

    const result = await pool.query(
      "SELECT original_url, expires_at, is_active FROM urls WHERE short_code = $1",
      [shortCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).send("URL not found");
    }

    const { original_url, expires_at, is_active } = result.rows[0];

    // ✅ Check if Link is Paused/Inactive
    if (is_active === false) {
      res.setHeader("Content-Type", "text/html");
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Paused - SleekLink</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: linear-gradient(135deg, #090d16 0%, #111827 100%);
              color: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              overflow: hidden;
            }
            .card {
              background: rgba(255, 255, 255, 0.02);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.07);
              border-radius: 24px;
              padding: 48px 32px;
              text-align: center;
              max-width: 420px;
              width: 90%;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              animation: scaleUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .icon-wrapper {
              width: 80px;
              height: 80px;
              margin: 0 auto 24px auto;
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 20px rgba(239, 68, 68, 0.1);
            }
            .icon {
              font-size: 32px;
              animation: pulse 2.5s infinite ease-in-out;
            }
            h1 {
              font-size: 1.6rem;
              margin: 0 0 12px 0;
              color: #f9fafb;
              font-weight: 700;
              letter-spacing: -0.02em;
            }
            p {
              color: #9ca3af;
              font-size: 0.95rem;
              line-height: 1.6;
              margin: 0 0 28px 0;
            }
            .badge {
              display: inline-block;
              background: rgba(239, 68, 68, 0.15);
              border: 1px solid rgba(239, 68, 68, 0.3);
              color: #f87171;
              padding: 6px 16px;
              border-radius: 9999px;
              font-size: 0.8rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            @keyframes scaleUp {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.9; }
              50% { transform: scale(1.08); opacity: 1; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-wrapper">
              <span class="icon">⏸️</span>
            </div>
            <h1>Link Temporarily Paused</h1>
            <p>The creator of this link has temporarily deactivated it. Please check back later or contact the owner.</p>
            <div class="badge">Paused</div>
          </div>
        </body>
        </html>
      `);
    }

    if (expires_at && new Date() > new Date(expires_at)) {
      return res.status(410).send("Link expired");
    }

    // ✅ LOG CLICK ON CACHE MISS
    const userAgent = req.get("User-Agent") || "";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const referrer = req.headers["referer"] || req.headers["referrer"] || "Direct";
    const { browser, os, device } = parseUserAgent(userAgent);

    await pool.query(
      "INSERT INTO clicks (short_code, ip_address, user_agent, browser, os, device, referrer) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [shortCode, ipAddress, userAgent, browser, os, device, referrer]
    );

    // Cache it
    if (client) {
      await client.set(shortCode, original_url, { EX: 3600 });
    }

    return res.redirect(original_url);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Check if the URL exists
    const urlCheck = await pool.query(
      "SELECT * FROM urls WHERE short_code = $1",
      [shortCode]
    );
    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: "URL not found" });
    }

    // 1. Total Clicks
    const totalClicksResult = await pool.query(
      "SELECT COUNT(*) AS total_clicks FROM clicks WHERE short_code = $1",
      [shortCode]
    );
    const totalClicks = parseInt(totalClicksResult.rows[0].total_clicks) || 0;

    // 2. Devices distribution
    const devicesResult = await pool.query(
      "SELECT COALESCE(device, 'Desktop') as device, COUNT(*) as count FROM clicks WHERE short_code = $1 GROUP BY device ORDER BY count DESC",
      [shortCode]
    );

    // 3. Browsers distribution
    const browsersResult = await pool.query(
      "SELECT COALESCE(browser, 'Other') as browser, COUNT(*) as count FROM clicks WHERE short_code = $1 GROUP BY browser ORDER BY count DESC LIMIT 8",
      [shortCode]
    );

    // 4. OS distribution
    const osResult = await pool.query(
      "SELECT COALESCE(os, 'Other') as os, COUNT(*) as count FROM clicks WHERE short_code = $1 GROUP BY os ORDER BY count DESC LIMIT 8",
      [shortCode]
    );

    // 5. Referrers distribution
    const referrersResult = await pool.query(
      "SELECT COALESCE(referrer, 'Direct') as referrer, COUNT(*) as count FROM clicks WHERE short_code = $1 GROUP BY referrer ORDER BY count DESC LIMIT 10",
      [shortCode]
    );

    // 6. Click history timeline (last 7 days)
    const timelineResult = await pool.query(
      `SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as click_date, COUNT(*) as count 
       FROM clicks 
       WHERE short_code = $1 AND timestamp > NOW() - INTERVAL '7 days' 
       GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD') 
       ORDER BY click_date ASC`,
      [shortCode]
    );

    res.json({
      shortCode,
      totalClicks,
      devices: devicesResult.rows,
      browsers: browsersResult.rows,
      os: osResult.rows,
      referrers: referrersResult.rows,
      timeline: timelineResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllUrls = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT short_code, original_url, expires_at, is_active FROM urls ORDER BY id DESC",
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const deleteUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // ❌ Check if exists
    const existing = await pool.query(
      "SELECT * FROM urls WHERE short_code = $1",
      [shortCode],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "URL not found" });
    }

    // 🔥 Delete clicks first
    await pool.query("DELETE FROM clicks WHERE short_code = $1", [shortCode]);

    // 🔥 Delete URL
    await pool.query("DELETE FROM urls WHERE short_code = $1", [shortCode]);

    // 🔥 Remove from Redis cache
    if (client) {
      await client.del(shortCode);
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const toggleActive = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Check if exists
    const existing = await pool.query(
      "SELECT * FROM urls WHERE short_code = $1",
      [shortCode],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "URL not found" });
    }

    const currentStatus = existing.rows[0].is_active;
    const newStatus = !currentStatus;

    // Update is_active state
    await pool.query(
      "UPDATE urls SET is_active = $1 WHERE short_code = $2",
      [newStatus, shortCode],
    );

    // 🔥 Delete from Redis cache to prevent redirection of paused links
    if (client) {
      await client.del(shortCode);
    }

    res.json({
      message: `Link ${newStatus ? "activated" : "paused"} successfully`,
      is_active: newStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  shortenUrl,
  redirectUrl,
  getAnalytics,
  getAllUrls,
  deleteUrl,
  toggleActive,
};
