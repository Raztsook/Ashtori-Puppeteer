
const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = "tokens";

const app = express();

app.get("/", async (req, res) => {
  const url = req.query.url || "https://app--training-space-e7c9cafa.base44.app";

  console.log("🚀 Starting Puppeteer token fetch flow");
  console.log("🌍 Target URL:", url);
  console.log("🔐 Airtable Token Present:", !!AIRTABLE_TOKEN);
  console.log("🔐 Airtable Base ID:", AIRTABLE_BASE_ID);

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    return res.status(500).send("❌ Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID");
  }

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

    console.log("🌐 Navigating to site...");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait a bit for the site to initialize any JS-based tokens
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("🔍 Trying to extract token from localStorage...");
    const token = await page.evaluate(() => {
      try {
        return localStorage.getItem("token");
      } catch (err) {
        return null;
      }
    });

    console.log("📦 Token retrieved:", token ? token.slice(0, 10) + "..." : "❌ Not found");

    if (!token) {
      await browser.close();
      return res.status(400).send("❌ Token not found in localStorage.");
    }

    // Send token to Airtable
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
    const airtableResponse = await axios.post(airtableUrl, {
      fields: {
        token: token,
        created: new Date().toISOString()
      }
    }, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    console.log("✅ Token sent to Airtable with record ID:", airtableResponse.data.id);

    await browser.close();
    res.status(200).json({ tokenStored: true, airtableRecordId: airtableResponse.data.id });

  } catch (err) {
    console.error("🔥 Error occurred:", err.message);
    res.status(500).send("🔥 Error: " + err.message);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("✅ Server running on port", port));