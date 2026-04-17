const express = require("express");
const router = express.Router();
const { login } = require("../controllers/loginController");
const { register } = require("../controllers/registerController");
const { verify } = require("../controllers/authController");

router.post("/login", login); // attaching routeHandlers(controllers)
router.post("/register", register);
router.post("/verify", verify);

module.exports = router;
