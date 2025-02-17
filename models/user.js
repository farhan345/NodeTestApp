const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { stringify } = require("querystring");
const validator = require("validator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "please enter your name"],
  },
  email: {
    type: String,
    required: [true, "please enter your email"],
    unique: true,
    validate: [validator.isEmail, "please enter correct email"],
  },
  profile: {
    type: String,
    required: [true, "please upload your profile picture"],
  },
  document: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    required: [true, "please enter your address"],
  },
  number: {
    type: Number,
    required: [true, "please enter your number"],
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerifyOTP: String,
  phoneVerifyOTPExpire: Date,
  isDocumentVerified: {
    type: Boolean,
    default: false,
  },
  accessLevel: {
    type: Number,
    default: 1, // 1 for not verified
  },
  isUserBlock: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    default: "pending",
  },
  password: {
    type: String,
    required: [true, "please enter your password"],
    minLength: [8, "password should be greater than 8 characters"],
    select: false,
  },
  resetPasswordOTP: {
    type: String,
    select: false,
  },
  emailverifyOTP: {
    type: String,
    select: false,
  },
  emailVerifyOTPExpire: {
    type: Date,
    select: false,
  },
  resetPasswordExpire: {
    type: Date,
    select: false,
  },
  documentStatus: {
    type: String,
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: String,
    default: "",
  },
  verifiedAt: {
    type: Date,
  },
  blockedAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

//this method will be called before saving schema

// userSchema.pre('find', function() {
//     this.where({ isDeleted: false });
//   });

//   userSchema.pre('findOne', function() {
//     this.where({ isDeleted: false });
//   });
//   userSchema.pre('findById', function() {
//     this.where({ isDeleted: false });
//   });

userSchema.pre("save", async function (next) {
  console.log("called");
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 12);
});

// userSchema.pre(/^find/, function (next) {
//     this.populate({
//       path: 'product',
//       select: '-isDeleted',
//       match: { isDeleted: false },
//     });
//     next();
//   });

//get JWT Token

userSchema.methods.getJWTToken = async function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};
//get reset password opt
userSchema.methods.getResetPasswordOPT = function () {
  const resetPasswordOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
  this.resetPasswordOTP = crypto
    .createHash("sha256")
    .update(resetPasswordOTP)
    .digest("hex");
  this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
  return resetPasswordOTP;
};
//get email verification otp
userSchema.methods.getEmailVerificationOPT = function () {
  debugger;
  const emailverifyOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
  this.emailverifyOTP = crypto
    .createHash("sha256")
    .update(emailverifyOTP)
    .digest("hex");
  this.emailVerifyOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
  return emailverifyOTP;
};

userSchema.methods.getPhoneVerificationOTP = function () {
  const phoneVerifyOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
  this.phoneVerifyOTP = crypto
    .createHash("sha256")
    .update(phoneVerifyOTP)
    .digest("hex");
  this.phoneVerifyOTPExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return phoneVerifyOTP;
};

//compare password

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const userModel = mongoose.model("userModel", userSchema);

module.exports = userModel;
