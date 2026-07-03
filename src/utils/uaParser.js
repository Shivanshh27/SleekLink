/**
 * Simple, lightweight, dependency-free utility to parse User-Agent header
 * into device type, operating system, and browser name.
 */
function parseUserAgent(uaString) {
  if (!uaString) {
    return { browser: "Unknown", os: "Unknown", device: "Desktop" };
  }

  let browser = "Other";
  let os = "Other";
  let device = "Desktop";

  const ua = uaString.toLowerCase();

  // 1. Device detection
  if (ua.includes("ipad") || ua.includes("playbook") || ua.includes("silk") || (ua.includes("android") && !ua.includes("mobi"))) {
    device = "Tablet";
  } else if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipod") || ua.includes("blackberry") || ua.includes("opera mini")) {
    device = "Mobile";
  }

  // 2. OS detection
  if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os x")) {
    os = "macOS";
  } else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    os = "iOS";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  // 3. Browser detection
  if (ua.includes("chrome") || ua.includes("chromium")) {
    if (ua.includes("edg")) {
      browser = "Edge";
    } else if (ua.includes("opr") || ua.includes("opera")) {
      browser = "Opera";
    } else {
      browser = "Chrome";
    }
  } else if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")) {
    browser = "Safari";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("msie") || ua.includes("trident")) {
    browser = "IE";
  }

  return { browser, os, device };
}

module.exports = { parseUserAgent };
