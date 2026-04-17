const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please provide a name"],
    minLength: [3, "Name must be at least 3 characters long"],
    maxLength: [50, "Name cannot exceed 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ], //regex
  },
  password: {
    type: String,
    require: true,
    minlength: [6, "Password must be at least 6 characters long"],
    maxlength: [12, "Password cannot exceed 12 characters"],
    select: false, //don't return password in queries
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    //allow user to edit profile
    type: Date,
    default: Date.now,
  },
  isVerified: {
    //implement email verification
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: {values: ["admin", "user"],
    message: "Role must be either admin or user"
    },
    default: "user",
  },
  profilePicture: {
    //implement s3 to store image and save url
    type: String,
    default: null,
  },
  simulationCount: {
    //update here and simulation collection
    type: Number,
    default: 0,
  },
});

userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email }).select("password"); //only return password and _id

  if (!user) {
    throw new Error("Invalid email or password");
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }
  return user; //return user object, then call generateJwtToken function
};

userSchema.statics.register = async function (username, email, password) {
  const exist = await this.findOne({ email });
  if (exist) {
    throw new Error("User already exists");
  }
  //this.create triggers pre 'save' middleware, this.insertOne skip middleware straight save no hashing
  return await this.create({username, email, password});
};

userSchema.methods.executeSimulation = async function () {};

userSchema.methods.generateJwtToken = function () {
  return jwt.sign({ userId: this._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

userSchema.methods.modifyEmail = async function (newEmail){
  const exist = await this.findOne({email: newEmail});
  if(!exist){
    throw new Error("Email does not exists");
  }
  this.email = newEmail;
  return this.save();
}

//middleware before saving new user,
//used async because bcrypt is time-consuming
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    console.error("Error hashing password:", err);
    throw err;
  }
});

module.exports = mongoose.model("users", userSchema);
