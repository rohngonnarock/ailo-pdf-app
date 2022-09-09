const puppeteer = require("puppeteer");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios");
const hbs = require("hbs");
const htmlPdf = require("html-pdf");
const fs = require("fs");
const path = require("path");

const app = express();

app.set("view engine", "html");
app.engine("html", hbs.__express);
app.set("views", "./views");

app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

const generateAccessToken = (username) => {
  return jwt.sign(username, process.env.SUPER_SECRET);
};

const ailoHeaderTemplate = `<style>
  .header {
    color: rgb(14, 74, 76);
    font-size: 10px;
    width: 100%;
    font-family: Raleway, Arial, Helvetica, sans-serif;
  }

  .header .topbar {
    border-top: 20px solid rgb(14, 74, 76);
    margin-top: -10px;
  }

  .header .headermain {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
  }

  .header .headermain .subheader {
    display: flex;
    gap: 10px;
  }

  .header .headermain .subheader>div {
    border-right: 1px solid rgb(177, 177, 177);
    padding: 0 5px;
    height: 20px;
    font-size: 8px;
    color: rgb(177, 177, 177);
  }

  .header .headermain .subheader>div:last-child {
    display: flex;
    align-items: center;
    border-right: 0;
    color: rgb(14, 74, 76);
  }

</style>
<div class="header">
  <div class="topbar"> </div>
  <div class="headermain">
    <div class="logo">
      <img width="160" src="data:image/jpeg;base64,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" />
    </div>

    <div class="subheader">
      <div>
        <div> Dreifürstensteinstr. 1-3</div>
        <div> 72116 Mössingen</div>
      </div>
      <div>
        <div> t: +49 15784045454</div>
        <div> e: info@ailo-it.de</div>
      </div>
      <div> <strong> www.ailo-it.de </strong></div>
    </div>

  </div>
</div>
`;

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

const generatePDFJson = async ({
  htmlBody,
  displayHeaderFooter,
  footerTemplate,
  headerTemplate,
  showAiloHeader,
  format,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
}) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlBody);
  console.log(showAiloHeader);

  const pdfBuffer = await page.pdf({
    format: format,
    displayHeaderFooter: displayHeaderFooter,
    headerTemplate: showAiloHeader ? ailoHeaderTemplate : headerTemplate,
    footerTemplate: footerTemplate,
    margin: {
      bottom: marginBottom,
      left: marginLeft,
      right: marginRight,
      top: marginTop,
    },
    printBackground: true,
  });

  await page.close();
  await browser.close();

  return pdfBuffer;
};

app.post("/", async (req, res) => {
  const htmlString = req.body;
  const pdf = await generatePDFByHtml(htmlString);
  res.set("Content-Type", "application/pdf");
  res.send(pdf);
});

app.post("/pdfbyjson", authenticateToken, async (req, res) => {
  const pdf = await generatePDFJson(req.body);
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

app.post("/image", async (req, res) => {
  const htmlString = req.body;
  const pdf = await generatePDFByHtml(htmlString);
  res.set("Content-Type", "application/pdf");
  res.send(pdf);
});

// app.post("/getToken", async (req, res) => {
//   res.send(generateAccessToken("ailo-token"));
// });

const parsedtemplate = (i18n, data, parameter) => {
  const templateStr = fs
    .readFileSync(path.resolve(__dirname, "views/sample.html"))
    .toString("utf8");

  const handleBarTemplate = hbs.handlebars.compile(templateStr, {
    noEscape: true,
  });

  const compiledHtml = handleBarTemplate({
    data,
    parameter,
    i18n,
  });

  return compiledHtml;
};

const getData = () => {
  const data = {
    is_logo: true,
    client: {
      name: "coupolino AG",
      name_addition: "name_addition",
      address_street: "Ringstrasse 5",
      address_zip: "8952 Schlieren",
      address_city: "Schweiz",
      address_country: "address_country",
      contact_phone: 99889988,
      contact_fax: "contact_fax",
      contact_email: "contact_email",
      website: "website",
      district_court: "district_court",
      company_register: "company_register",
      vat_number: "vat_number",
      tax_number: "tax_number",
      ceo_name: "ceo_name",
      is_owner: "is_owner",
      is_ceo: "is_ceo",
      bank: "bank",
      bank_account_number: "bank_account_number",
      bank_number: "bank_number",
      bank_iban: "bank_iban",
      bank_bic: "bank_bic",
      test: true,
    },
  };

  const parameter = {
    letterpaper_S: true,
    printFoldLines_Y: true,
    printPageNumbers_Y: true,
    printFooter_Y: true,
    printDeliveryReturn_Y: true,
    qrCode_Y: true,
    printPartNumber_Y: true,
    printPosTax_Y: true,
    printSwissPaymentSlip_SHOW_NO_IMG: true,
    printSwissPaymentSlip_SHOW_ESR: true,
  };

  const i18n = true;
  return { i18n, data, parameter };
};

app.post("/template", async (req, res) => {
  const { i18n, data, parameter } = getData();
  res.render("sample", { data, parameter, i18n });
});

app.post("/hbsPdf", async (req, res) => {
  const { i18n, data, parameter } = getData();

  const compiledHtml = parsedtemplate(i18n, data, parameter);

  var options = {
    format: "A4",
    orientation: "portrait",
    border: {
      top: "1in",
      right: "1in",
      bottom: "1in",
      left: "1in",
    },
  };

  htmlPdf.create(compiledHtml, options).toBuffer(function (err, buffer) {
    res.set("Content-Type", "application/pdf");
    res.send(buffer);
  });
});

app.post("/hbshtmlPdf", async (req, res) => {
  const { i18n, data, parameter } = getData();

  const compiledHtml = parsedtemplate(i18n, data, parameter);

  const pdf = await generatePDFByHtml(compiledHtml);
  res.set("Content-Type", "application/pdf");
  res.send(pdf);
});

// app.listen(3000, () => {
//   console.log(`Example app listening on port 3000`);
// });

exports.pdf = app;
