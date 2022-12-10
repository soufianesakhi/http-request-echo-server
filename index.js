import cors from "cors";
import express from "express";
import fetch from "node-fetch";

process.on("unhandledRejection", (reason, p) => {
  console.error(reason, "Unhandled Rejection at Promise", p);
});

const port = process.env.PORT ?? 3000;

const app = express();
app.use(noParsing);
app.use(noCache);
app.use(cors());
app.use(
  express.raw({
    inflate: true,
    limit: process.env.LIMIT ?? "500kb",
    type: "*/*",
  })
);
app.use((err, req, res, next) => errorHandler(err, res));

app.all("*", async (req, res) => {
  try {
    if (req.get("accept") == "application/vnd.favicon.url") {
      return await getFavicon(req, res);
    }
    let body = req.body;
    let contentType = req.get("x-content-type");
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
      // empty body
      body = decodeURIComponent(req.path.substring(1));
      contentType = "text/plain";
    }
    res.set("Content-Type", contentType);
    res.status(200).send(body);
  } catch (e) {
    errorHandler(e, res);
  }
});

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});

function noParsing(req, res, next) {
  req.headers["x-content-type"] =
    req.headers["content-type"] ?? "application/octet-stream";
  req.headers["content-type"] = "application/octet-stream"; // Force express to not parse the body
  next();
}

function noCache(req, res, next) {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
}

/**
 *
 * @param {unknown} err
 * @param {import("express").Response} res
 */
function errorHandler(err, res) {
  if (err instanceof Error) {
    console.error(err.stack);
  } else {
    console.error("Unexpected error", err);
  }
  res.sendStatus(400);
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
async function getFavicon(req, res) {
  const baseUrl = req.path.replace(/^\//gi, "").replace(/\/$/gi, "");
  let iconUrl = `${baseUrl}/favicon.ico`;
  try {
    const result = await fetch(iconUrl);
    if (result.status >= 400) {
      const html = await (await fetch(baseUrl)).text();
      const exec = /<link rel="[^"]*icon".*href="([^"]+)"/.exec(html);
      if (exec.length > 1) {
        const iconPath = exec[1];
        iconUrl = `${baseUrl}${iconPath}`;
      }
    }
  } catch (err) {
    if (err["code"] == "ENOTFOUND") {
      return res.sendStatus(404);
    }
  }
  res.send(iconUrl);
}
