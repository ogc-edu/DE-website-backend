const bcrypt = require("bcrypt");
const { connectDB, closeDB } = require("../config/database");
const User = require("../models/user");

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.login(email, password);
    const token = user.generateJwtToken();
    res.status(200).json({ message: "Login successful", token: token });
  } catch (error) {
    next(error); //pass to error handler middleware
  }
};
module.exports = { login };
