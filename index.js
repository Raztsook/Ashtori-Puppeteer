
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/", async (req, res) => {
  const url = req.query.url || "https://app--training-space-e7c9cafa.base44.app";

  console.log("🚀 Launching Puppeteer");
  console.log("🌍 Navigating to:", url);

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

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Allow time for page scripts to run
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try extracting token just for debug/logging
    const token = await page.evaluate(() => {
      try {
        return localStorage.getItem("token");
      } catch (e) {
        return null;
      }
    });

    console.log("🧠 Token in localStorage:", token ? token.slice(0, 10) + "..." : "❌ Not found");

    // Try detecting whether webhook was triggered
    let webhookConfirmed = false;
    const start = Date.now();
    const maxWait = 180000; // 3 minutes

    while (Date.now() - start < maxWait) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes("Monthly summaries sent")) {
        webhookConfirmed = true;
        break;
      }

      await page.mouse.move(100 + Math.random() * 50, 200 + Math.random() * 50);
      await page.evaluate(() => window.scrollBy(0, 20));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await browser.close();

    console.log("✅ webhookConfirmed:", webhookConfirmed);
    res.status(200).json({ webhookConfirmed });

  } catch (err) {
    console.error("🔥 Error occurred:", err.message);
    res.status(500).send("🔥 Error: " + err.message);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("✅ Server running on port", port));