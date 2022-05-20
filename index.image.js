const puppeteer = require("puppeteer");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

require("dotenv").config(); // for local only

const generateAccessToken = (username) => {
  return jwt.sign(username, process.env.SUPER_SECRET);
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.SUPER_SECRET, (err, user) => {
    if (err) return res.send(err);
    req.user = user;
    next();
  });
};

const generatePDFByLink = async (link) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(link, {
    waitUntil: "networkidle0",
  });
  const pdfBuffer = await page.pdf({ format: "A4" });

  await page.close();
  await browser.close();

  return pdfBuffer;
};

const generatePDFByHtml = async (html = "") => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);
  const pdfBuffer = await page.pdf({
    printBackground: true,
    format: "A4",
  });

  await page.close();
  await browser.close();

  return pdfBuffer;
};

app.post("/", authenticateToken, async (req, res) => {
  const htmlString = req.body;
  const pdf = await generatePDFByHtml(htmlString);
  res.set("Content-Type", "application/pdf");
  res.send(pdf);
});

app.post("/pdfbylink", authenticateToken, async (req, res) => {
  if (req.body) {
    const pdf = await generatePDFByLink(req.body);
    res.set("Content-Type", "application/pdf");
    res.send(pdf);
  } else {
    res.send("url missing");
  }
});

app.post("/blob", authenticateToken, async (req, res) => {
  const htmlString = req.body;
  const pdf = await generatePDFByHtml(htmlString);
  res.set("Content-Type", "application/octet-stream");
  res.set("Content-Disposition", "attachment; filename=ailo.pdf");
  res.send(pdf);
});

app.post("/getToken", async (req, res) => {
  res.send(generateAccessToken("ailo-token"));
});

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`);
});

exports.pdf = app;
