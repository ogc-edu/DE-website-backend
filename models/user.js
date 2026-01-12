const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a name'],
    maxLength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String, 
    required: [true, 'Please provide an email'],
    unique: true, 
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'], //regex
    immutable: true
    //*= optional += mandatory 
  },
  password: {
    type: String, 
    require: true,
    minlength: [6, 'Password must be at least 6 characters long'],
    maxlength: [12, 'Password cannot exceed 12 characters'],
    select: false //don't return password in queries
  },
  createdAt:{
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt:{   //allow user to edit profile 
    type: Date,
    default: Date.now
  },
  isVerified:{      //implement email verification
    type: Boolean,
    default: false
  },
  role:{    
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  profilePicture: {   //implement s3 to store image and save url 
    type: String,
    default: null
  },
  simulationCount: {    //update here and simulation collection
    type: Number,
    default: 0,
  }
})

userSchema.methods.comparePassword = async function(candidatePassword){
  return await bcrypt.compare(candidatePassword, this.password);
}

userSchema.methods.generateJwtToken = function(){
  return jwt.sign({username: this.username}, process.env.JWT_SECRET, {expiresIn: '1h'});
}

userSchema.statics.login = async function(email, password){
  const user = await this.findOne({email}).select('+password');
      if(!user){
        throw new Error('Invalid email or password');
      }
      const isPasswordValid = await user.comparePassword(password);
      if(!isPasswordValid){
        throw new Error('Invalid email or password');
      }
      return user;
}

userSchema.statics.register = async function(username, email, password){
  const exist = await this.findOne({email});
  if(exist){
    throw new Error('User already exists');
  }
  const user = await this.create({username, email, password});    //this.create triggers pre 'save' middleware, this.insertOne skip middleware straight save no hashing
  return user;
}
//middleware before saving document 
userSchema.pre('save', async function(next){
  if(!this.isModified('password')){return next()}
  try{
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  }catch(err){
    //pass to error handler
    next(err);
  }
})

module.exports = mongoose.model('User', userSchema);