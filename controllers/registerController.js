const users = require("../models/user");

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    await users.register(username, email, password);
    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { register };
