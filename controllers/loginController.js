const bcrypt = require("bcrypt");
const { connectDB, closeDB } = require("../config/database");
const User = require("../models/user");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.login(email, password);
    const token = user.generateJwtToken();
    return res.status(200).json({ message: "Login successful", token: token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Database connection error" });
  }
};

module.exports = { login };
