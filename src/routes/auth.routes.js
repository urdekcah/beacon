const express = require('express');
const router = express.Router();
const { signupValidation, signinValidation } = require('../validators/auth.validator');
const { requireAuth } = require('../middleware/auth');

module.exports = (authController, csrfProtection) => {
  router.get("/zaregistrirovatsya", csrfProtection, (req, res) => {
    res.render("signup", { csrfToken: req.csrfToken() });
  });

  router.get("/voyti", csrfProtection, (req, res) => {
    res.render("signin", { csrfToken: req.csrfToken() });
  });

  router.get("/vykhod", requireAuth, authController.signout.bind(authController));

  router.post(
    "/zaregistrirovatsya",
    csrfProtection,
    signupValidation,
    authController.signup.bind(authController)
  );

  router.post(
    "/voyti",
    csrfProtection,
    signinValidation,
    authController.signin.bind(authController)
  );

  return router;
};