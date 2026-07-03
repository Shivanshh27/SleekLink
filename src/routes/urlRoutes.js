const express = require("express");
const router = express.Router();

const { shortenUrl, redirectUrl, getAnalytics, getAllUrls, deleteUrl, toggleActive } = require("../controllers/urlController");
router.post("/shorten", shortenUrl);
router.get("/urls", getAllUrls);
router.delete("/delete/:shortCode", deleteUrl);
router.patch("/toggle-active/:shortCode", toggleActive);
router.get("/:shortCode", redirectUrl);
router.get("/analytics/:shortCode", getAnalytics);
module.exports = router;
