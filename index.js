// index.js
const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = "tokens";

const app = express();

app.get("/", async (req, res) => {
  const url = req.query.url || "https://app--training-space-e7c9cafa.base44.app";

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    return res.status(500).send("❌ Missing environment variables");
  }

  try {
    // Fetch token from Airtable
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?maxRecords=1&sort[0][field]=created&sort[0][direction]=desc`;
    const response = await axios.get(airtableUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const token = response.data.records?.[0]?.fields?.token;
    if (!token) return res.status(400).send("❌ No token found in Airtable");

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ]
    });

    const page = await browser.newPage();

    // Inject token into localStorage before scripts load
    await page.evaluateOnNewDocument((tk, origin) => {
      if (location.origin === origin) {
        localStorage.setItem("token", tk);
      }
    }, token, new URL(url).origin);

    // Load site
    await page.goto(url, { waitUntil: "networkidle2" });

    // Reload to ensure React picks up token
    await page.reload({ waitUntil: "networkidle2" });

    // Wait for indication of webhook being sent
    const maxWait = 180000; // 3 minutes
    const start = Date.now();
    let webhookSent = false;

    while (Date.now() - start < maxWait) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes("Monthly summaries sent")) {
        webhookSent = true;
        break;
      }
    
      await page.mouse.move(100 + Math.random() * 50, 200 + Math.random() * 50);
      await page.evaluate(() => window.scrollBy(0, 20));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    

    await browser.close();

    res.status(200).json({ webhookConfirmed: webhookSent });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).send("Error: " + err.message);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("✅ Server is running on port", port));
