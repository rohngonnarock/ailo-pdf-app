const puppeteer = require("puppeteer");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

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

  const pdfBuffer = await page.pdf({ format: "A4" });

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

app.post("/postForm", async (req, res) => {
  const reqPayload = JSON.parse(req.body.payload);
  const payload = {
    type: "home",
    blocks: [
      {
        type: "image",
        title: {
          type: "plain_text",
          text: "I Need a Marg",
          emoji: true,
        },
        image_url:
          "https://assets3.thrillist.com/v1/image/1682388/size/tl-horizontal_main.jpg",
        alt_text: "marg",
      },
    ],
  };
  await axios.post(reqPayload.response_url, payload);
  res.send(200);
});

app.post("/test", async (req, res) => {
  const block = {
    blocks: [
      {
        type: "input",
        element: {
          type: "plain_text_input",
          action_id: "plain_text_input-action",
        },
        label: {
          type: "plain_text",
          text: "Enter Your Name",
          emoji: true,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Click Me",
              emoji: true,
            },
            value: "click_me_123",
            action_id: "actionId-0",
          },
        ],
      },
      {
        type: "input",
        element: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Select an item",
            emoji: true,
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "*this is plain_text text*",
                emoji: true,
              },
              value: "value-0",
            },
            {
              text: {
                type: "plain_text",
                text: "*this is plain_text text*",
                emoji: true,
              },
              value: "value-1",
            },
            {
              text: {
                type: "plain_text",
                text: "*this is plain_text text*",
                emoji: true,
              },
              value: "value-2",
            },
          ],
          action_id: "static_select-action",
        },
        label: {
          type: "plain_text",
          text: "Label",
          emoji: true,
        },
      },
      {
        type: "input",
        element: {
          type: "datepicker",
          initial_date: "1990-04-28",
          placeholder: {
            type: "plain_text",
            text: "Select a date",
            emoji: true,
          },
          action_id: "datepicker-action",
        },
        label: {
          type: "plain_text",
          text: "Label",
          emoji: true,
        },
      },
      {
        type: "input",
        element: {
          type: "checkboxes",
          options: [
            {
              text: {
                type: "plain_text",
                text: "Terms & Conditions",
                emoji: true,
              },
              value: "value-0",
            },
          ],
          action_id: "checkboxes-action",
        },
        label: {
          type: "plain_text",
          text: "Label",
          emoji: true,
        },
      },
    ],
  };
  res.send(block);
});

// app.post("/getToken", async (req, res) => {
//   res.send(generateAccessToken("ailo-token"));
// });

// app.listen(3000, () => {
//   console.log(`Example app listening on port 3000`);
// });

exports.pdf = app;
