const users = require("../models/user");
const { connectDB, closeDB } = require("../config/database");

const register = async (req, res, next) => {
  try {
    //only await connectDB and closeDB at server.js do not connect or close in controller, expensive process takes time
    const { username, email, password } = req.body;
    await users.register(username, email, password);
    res
      .status(201)
      .json({ sucess: true, message: "User registered successfully" });
  } catch (err) {
    //pass to error handler middleware
    next(err); //straight call error handler since ady handled by user model(register static function)
  }
};

module.exports = { register };
