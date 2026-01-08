const UserLogin = require("../models/userLogin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB, getDB, closeDB } = require("../config/database");
const generateToken = require("../utils/tokenUtils");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await connectDB();
    const userCollection = db.collection("Users");
    const user = await userCollection.findOne({ email });
    if (!user) {
      await closeDB();
      return res.status(401).json({ error: "No user found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await closeDB();
      return res.status(401).json({ error: "Invalid password" });
    }
    await closeDB();
    const token = generateToken(email);
    return res.status(200).json({ message: "Login successful", token: token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Database connection error" });
  }
};

module.exports = { login };
