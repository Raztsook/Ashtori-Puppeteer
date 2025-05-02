const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/", async (req, res) => {
  const url = req.query.url || "https://app--training-space-e7c9cafa.base44.app";

  try {
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

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const token = await page.evaluate(() => {
      return localStorage.getItem("token");
    });

    if (!token) {
      await browser.close();
      return res.status(400).send("No token found in localStorage");
    }

    const page2 = await browser.newPage();
    await page2.goto("about:blank");
    await page2.evaluate((tk) => {
      localStorage.setItem("token", tk);
    }, token);

    await page2.goto(url, { waitUntil: "networkidle2" });

    let foundText = false;
    const maxWaitTimeMs = 3 * 60 * 1000;
    const intervalMs = 1000;
    const start = Date.now();

    while (Date.now() - start < maxWaitTimeMs) {
      const text = await page2.evaluate(() => document.body.innerText);
      if (text.includes("Monthly summaries sent")) {
        foundText = true;
        break;
      }
      await page2.mouse.move(100 + Math.random() * 50, 200 + Math.random() * 50);
      await page2.evaluate(() => window.scrollBy(0, 20));
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    await browser.close();
    res.status(200).json({ webhookConfirmed: foundText });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error running browser: " + err.message);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on port", port));
