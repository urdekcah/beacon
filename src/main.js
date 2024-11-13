const express = require("express");
const { body, validationResult } = require("express-validator");
const csrf = require("csurf");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const PORT = 3000;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/zaregistrirovatsya", csrfProtection, (req, res) => {
  res.render("signup", { csrfToken: req.csrfToken() });
});

app.post(
  "/zaregistrirovatsya",
  [
    body("username")
      .isLength({ min: 3, max: 20 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Username must be 3-20 characters and only include letters, numbers, underscores, or hyphens."),
    body("email").isEmail().withMessage("Please provide a valid email address."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }
      return true;
    })
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = {};
      errors.array().forEach((error) => {
        errorMessages[error.param] = error.msg;
      });
      return res.status(400).json({ errors: errorMessages });
    }

    res.redirect(303, "/dobro-pozhalovat");
  }
);

app.listen(PORT, () => {
  console.log(`Сервер работает на http://localhost:${PORT}`);
});