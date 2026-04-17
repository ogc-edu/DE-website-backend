const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  //format is Bearer <token>
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.redirect("/api/login");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userExists = await User.findById(decoded.userId).select("_id");
    if (!userExists) {
      return res.redirect("/api/login");
    }
    req.userId = decoded.userId; //add userId to request object
    next(); //pass control to next middleware or route handler

  } catch (err) {
    return res.redirect("/api/login");
  }
};

module.exports = authMiddleware;
