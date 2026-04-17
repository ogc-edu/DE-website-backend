const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verify = async (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1]; //get token from header
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); //verify token is valid with JWT_SECRET
    const user = await User.findById(decoded.userId).select("_id username"); //use decoded userID to locate user in db
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userData = {
      userId: user._id,
      username: user.username,
    };
    res.status(200).json({ status: true, userData: userData });
  } catch (err) {
    next(err);
  }
};

module.exports = { verify };