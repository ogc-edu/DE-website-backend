const users = require("../models/user");

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await users.login(email, password);
    const accessToken = user.generateJwtToken();
    const refreshToken = user.generateRefreshToken();
    await user.saveRefreshToken(refreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful", token: accessToken });
  } catch (error) {
    next(error);
  }
};

module.exports = { login };
