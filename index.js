const express = require("express");
const bodyParser = require("body-parser");
const colors = require("colors");
const _ = require("lodash");
const crypto = require("crypto");
require("dotenv").config();

const config = require("./config/config");
const ProductConfig = require("./product/config");

//config
const SERVER_PORT = config.SERVER_PORT;
const SHOPIFY_WEBHOOK_VERIFICATION_KEY =
  config.SHOPIFY_WEBHOOK_VERIFICATION_KEY;
const SHOPIFY_WEBHOOK_API_VERIFICATION_KEY = config.SHOPIFY_WEBHOOK_API_VERIFICATION_KEY;

function verifyShopifyWebhook(req, res, buf, encoding) {
  if (buf && buf.length) {
    const rawBody = buf.toString(encoding || "utf8");
    const hmac = req.get("X-Shopify-Hmac-Sha256");

    const topic = req.get("X-Shopify-Topic");

    const key = (topic === 'products/create') ? SHOPIFY_WEBHOOK_VERIFICATION_KEY : SHOPIFY_WEBHOOK_API_VERIFICATION_KEY;

    const hash = crypto
      .createHmac("sha256", key)
      .update(rawBody, "utf8", "hex")
      .digest("base64");

    req.custom_shopify_verified = (hmac === hash);
  } else {
    req.custom_shopify_verified = false;
  }
}
//express app
const app = express();
app.use(bodyParser.json({ verify: verifyShopifyWebhook }));

//Handle products/create event - this webhook is created via shopify admin dashboard
app.post("/webhook/product/create", (req, res, next) => {
  const product = _.pick(req.body, ProductConfig.KEYS);
  //verify webhook
  const verifiedLabel = (req.custom_shopify_verified ?  colors.green("[VERIFIED]") : colors.red("[NOT VERIFIED]"));
  console.info(
    `${colors.gray("[PEODUCT/CREATE]")} for ${product.title} (${
      product.id
    }) by ${product.vendor} - ${verifiedLabel} | ${colors.green("OK")}`
  );
  res.sendStatus(200);
});

//Handle products/update event - this webhook is created via API
app.post("/webhook/product/update", (req, res, next) => {
  const product = _.pick(req.body, ProductConfig.KEYS);
  const verifiedLabel = (req.custom_shopify_verified ?  colors.green("[VERIFIED]") : colors.red("[NOT VERIFIED]"));
  console.info(
    `${colors.gray("[PEODUCT/UPDATE]")} for ${product.title} (${
      product.id
    }) by ${product.vendor} - LAST UPDATED: ${colors.blue(
      product.updated_at 
    )} - ${verifiedLabel} | ${colors.green("OK")}`
  );
  res.sendStatus(200);
});

//listen
app.listen(SERVER_PORT, () => {
  console.log(`[SERVER] running on port ${SERVER_PORT}: ${colors.green("OK")}`);
});
