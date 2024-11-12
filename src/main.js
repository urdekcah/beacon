const express = require("express");
const bodyParser = require("body-parser");

const PORT = 3000;
const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.listen(PORT, () => {
  console.log(`Сервер работает на http://localhost:${PORT}`);
});