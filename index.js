
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/", async (req, res) => {
  const url = req.query.url || "https://app--training-space-e7c9cafa.base44.app";

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote"
      ]
    });

    const page = await browser.newPage();

    console.log("🌐 Navigating to:", url);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for scripts to run
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Try to read the token from localStorage
    const token = await page.evaluate(() => {
      try {
        return localStorage.getItem("token");
      } catch (err) {
        return null;
      }
    });

    await browser.close();

    res.status(200).json({
      success: true,
      token: token || null,
      message: token ? "✅ Token found!" : "❌ No token found."
    });

  } catch (err) {
    console.error("🔥 Error occurred:", err.message);
    res.status(500).send("🔥 Error: " + err.message);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("✅ Token test server listening on port", port));