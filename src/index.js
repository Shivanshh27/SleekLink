const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();

// ✅ CREATE APP FIRST
const app = express();

// ✅ CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowed = [
        "http://localhost:5173",
        "https://url-shortener-theta-ecru.vercel.app",
        "https://urlshortener.shivansh.online",
        "https://sleeklink.shivansh.online",
      ];

      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// ✅ Middleware
app.use(express.json());

// ✅ DB connect
connectDB();

// ✅ Redis (only local)
const { connectRedis } = require("./config/redis");
if (process.env.NODE_ENV !== "production") {
  connectRedis();
}

// ✅ Rate limiter
const rateLimiter = require("./middleware/rateLimiter");
app.use(rateLimiter);

// ✅ Routes
const urlRoutes = require("./routes/urlRoutes");
app.use("/", urlRoutes);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
