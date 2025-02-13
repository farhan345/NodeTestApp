const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const validator = require("validator");
const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "please enter your store name"],
  },
  email: {
    type: String,
    required: [true, "please enter your email"],
    unique: true,
    validate: [validator.isEmail, "please enter correct email"],
  },
  address: {
    type: String,
    required: [true, "please enter your address"],
  },
  country: {
    type: String,
    required: [true, "please enter your country"],
  },
  state: {
    type: String,
    required: [true, "please enter your state"],
  },
  // profile: {
  //     type: String,
  //     default:""
  // },
  coverPhoto: {
    type: String,
    default: "",
  },
  document: {
    type: String,
    required: [true, "please upload your documents"],
  },
  number: {
    type: Number,
    required: [true, "please enter your number"],
  },
  status: {
    type: String,
    default: "pending", //pendig approved blocked
  },
  accessLevel: {
    type: Number,
    default: 1, // 1 not verified , 2 block , 0 all access
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
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
  storeCategoryType: {
    type: mongoose.Schema.ObjectId,
    ref: "storeCategoryModel",
    required: [true, "Please select store Category Type"],
  },
  isStoreBlock: {
    type: Boolean,
    default: false,
  },
  isStoreInFavourite: {
    type: Boolean,
    default: false,
  },
  documentStatus: {
    type: String,
    default: "pending",
  },
  password: {
    type: String,
    required: [true, "please enter your password"],
    minLength: [8, "password should be greater than 8 characters"],
    select: false,
  },
  reviews: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: "userModel",
        required: true,
      },
      rating: {
        type: Number,
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
    },
  ],
  numOfReviews: {
    type: Number,
    default: 0,
  },
  ratings: {
    type: Number,
    default: 0,
  },
  isStoreHasOffer: {
    type: Boolean,
    default: false,
  },
  offerPercentage: {
    type: Number,
    default: 0,
  },
  stripeConnectedAccountId: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  verifiedAt: {
    type: Date,
  },
  blockedAt: {
    type: Date,
  },
  updatedAt: {
    type: String,
    default: "",
  },
  emailverifyOTP: String,
  resetPasswordOTP: String,
  resetPasswordExpire: Date,
  emailVerifyOTPExpire: Date,
});

storeSchema.index({ location: "2dsphere" });

//this method will be called before saving schema

storeSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

storeSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});
storeSchema.pre("findById", function () {
  this.where({ isDeleted: false });
});

storeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
});

// storeSchema.pre(/^find/, function (next) {
//     this.populate({
//       path: 'product',
//       select: '-isDeleted',
//       match: { isDeleted: false },
//     });
//     next();
//   });
//   storeSchema.pre(/^find/, function (next) {
//     this.populate({
//       path: 'employee',
//       select: '-isDeleted',
//       match: { isDeleted: false },
//     });
//     next();
//   });
//get JWT Token

storeSchema.methods.getJWTToken = async function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

//compare password

storeSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//get reset password opt
storeSchema.methods.getResetPasswordOPT = function () {
  const resetPasswordOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
  this.resetPasswordOTP = crypto
    .createHash("sha256")
    .update(resetPasswordOTP)
    .digest("hex");
  this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
  return resetPasswordOTP;
};
//get email verification otp
storeSchema.methods.getEmailVerificationOPT = function () {
  debugger;
  const emailverifyOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
  this.emailverifyOTP = crypto
    .createHash("sha256")
    .update(emailverifyOTP)
    .digest("hex");
  this.emailVerifyOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
  return emailverifyOTP;
};

storeSchema.methods.getPhoneVerificationOTP = function () {
  const phoneVerifyOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
  this.phoneVerifyOTP = crypto
    .createHash("sha256")
    .update(phoneVerifyOTP)
    .digest("hex");
  this.phoneVerifyOTPExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return phoneVerifyOTP;
};

const storeModel = mongoose.model("storeModel", storeSchema);

module.exports = storeModel;
