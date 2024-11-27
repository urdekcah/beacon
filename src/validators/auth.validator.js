const { body } = require("express-validator");

const signupValidation = [
  body("username")
    .isLength({ min: 3, max: 50 })
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
  }),
  body("birthdate").isDate().withMessage("Please provide a valid date."),
  body("nickname").trim().isLength({ min: 3, max: 150 }).withMessage("Nickname is required.")
];

const signinValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
];

module.exports = { signupValidation, signinValidation };