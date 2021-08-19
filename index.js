import express from "express";

const port = process.env.PORT ?? 3000;

const app = express();
app.use(noParsing);
app.use(noCache);
app.use(express.raw({
  inflate: true,
  limit: process.env.LIMIT ?? "500kb",
  type: "*/*"
}));

app.all("*", (req, res) => {
  try {
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
    console.log(e);
    res.sendStatus(400);
  }
});

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});

function noParsing(req, res, next) {
  req.headers["x-content-type"] = req.headers["content-type"] ?? "application/octet-stream";
  req.headers["content-type"] = "application/octet-stream"; // Force express to not parse the body
  next();
}

function noCache(req, res, next) {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
}
