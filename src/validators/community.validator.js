const { body } = require("express-validator");

const createCommunityValidation = [
  body("name")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .isLength({ min: 3, max: 21 })
    .withMessage("Community name must be 3-21 characters long."),
  body("description")
    .isLength({ min: 3, max: 150 })
    .withMessage("Description must be 3-150 characters long."),
];

module.exports = { createCommunityValidation };