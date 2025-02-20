const storeModel = require("../models/store");
const ServiceCharges = require("../models/serviceManagement");
const TaxManagement = require("../models/taxManagement");
const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const fs = require("fs");
const sendToken = require("../utils/getJwtToken");
const sendEmailTostore = require("../utils/sendMail");
const asyncErrorHandlers = require("../middleware/asyncErrorHandlers");
const crypto = require("crypto");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const productModel = require("../models/product");
const geolib = require("geolib");
const { log } = require("console");
const orderModel = require("../models/order");
const sendEmailWithTemplate = require("../utils/sendEmailWithTemplate");
const handlebars = require("handlebars");
const { userWelcomeEmailTemplate } = require("../utils/template");
const sendSMS = require("../utils/sendSms");

exports.storeRegister = asyncErrorCatch(async (req, res, next) => {
  const msg = "OTP is send on your email, please verify it first";
  if (!req.body.name) {
    return next(new ErrorHandler(400, "Please enter your name"));
  }
  if (!req.body.password) {
    return next(new ErrorHandler(400, "Please enter your password"));
  }
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Please enter your email"));
  }
  if (!req.body.number) {
    return next(new ErrorHandler(400, "Please enter your mobile number"));
  }
  if (!req.body.latitude) {
    return next(new ErrorHandler(400, "please enter user latitude"));
  }
  if (!req.body.longitude) {
    return next(new ErrorHandler(400, "please enter user longitude"));
  }
  if (!req.body.address) {
    return next(new ErrorHandler(400, "Please enter your address"));
  }
  if (!req.body.storeCategoryType) {
    return next(new ErrorHandler(400, "Please select store category type"));
  }
  if (!req.body.state) {
    return next(new ErrorHandler(400, "Please select store state"));
  }
  if (!req.body.country) {
    return next(new ErrorHandler(400, "Please select store country"));
  }
  if (!req.files?.storeDocument) {
    return next(new ErrorHandler(400, "Please select your store document"));
  }
  if (!req.files?.storeCover) {
    return next(new ErrorHandler(400, "Please select your store cover pic"));
  }
  // if (!req.files?.storeProfile) {
  //     return next(new ErrorHandler(400, "Please select your store profile"))
  // }
  const email = req.body.email.toLowerCase();
  const oldstore = await storeModel.findOne({ email: email });

  if (oldstore) {
    // fs.unlinkSync(req?.files?.storeProfile[0]?.path);
    fs.unlinkSync(req?.files?.storeDocument[0]?.path);
    fs.unlinkSync(req?.files?.storeCover[0]?.path);
    return next(
      new ErrorHandler(400, "Store Already Registered On This Email")
    );
  }

  const Data = {
    name: req.body.name,
    password: req.body.password,
    email: req.body.email.toLowerCase(),
    address: req.body.address,
    number: req.body.number,
    storeCategoryType: req.body.storeCategoryType,
    country: req.body.country,
    state: req.body.state,
    location: {
      type: "Point",
      coordinates: [
        parseFloat(req.body.longitude),
        parseFloat(req.body.latitude),
      ],
    },

    document: req?.files?.storeDocument[0]?.path,
    // profile: req.files.storeProfile[0].path,
    coverPhoto: req.files.storeCover[0].path,
  };

  const blockStore = await storeModel.findOne({
    email: email,
    isStoreBlock: true,
  });
  if (blockStore) {
    return next(
      new ErrorHandler(
        400,
        "Sorry you are not be able to register using this email"
      )
    );
  }

  storeModel.create(Data, async (err, result) => {
    if (err) {
      // fs.unlinkSync(req?.files?.storeProfile[0]?.path);
      fs.unlinkSync(req?.files?.storeDocument[0]?.path);
      fs.unlinkSync(req?.files?.storeCover[0]?.path);
      return next(new ErrorHandler(400, err.message));
    } else {
      const token = "";
      return sendOTPForEmailVerification(result, res, msg, token, false);
    }
  });
});

exports.storeLogin = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.password) {
    return next(new ErrorHandler(400, "Please enter your password"));
  }
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Please enter your email"));
  }

  const email = req.body.email.toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler(400, "Please enter email and password"));
  }

  const store = await storeModel.findOne({ email: email }).select("+password");
  if (!store) {
    return next(new ErrorHandler(401, "Invalid Email or Password"));
  }

  if (store.isStoreBlock === true) {
    return next(
      new ErrorHandler(400, "Sorry, your account has been blocked by admin")
    );
  }

  const isPasswordMatched = await store.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler(401, "Invalid Email or Password"));
  }

  // Check email verification first
  if (!store.isEmailVerified) {
    const token = "";
    return sendOTPForEmailVerification(
      store,
      res,
      "Please verify your email first",
      token,
      true
    );
  }

  // Check phone verification
  if (!store.isPhoneVerified) {
    // Send OTP for phone verification
    const phoneVerifyOTP = store.getPhoneVerificationOTP();
    await store.save({ validateBeforeSave: false });

    const message = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;

    try {
      await sendSMS(store.number, message);
      return res.status(200).json({
        success: false,
        message: "Please verify your phone number first",
        requiresPhoneVerification: true,
        store: {
          _id: store._id,
          number: store.number,
        },
      });
    } catch (error) {
      store.phoneVerifyOTP = undefined;
      store.phoneVerifyOTPExpire = undefined;
      await store.save({ validateBeforeSave: false });
      return next(
        new ErrorHandler(500, "Error sending SMS. Please try again later.")
      );
    }
  }

  // If both email and phone are verified, proceed with login
  const token = await store.getJWTToken();
  res.status(200).json({
    success: true,
    message: "Login Successfully",
    token,
    store,
  });
});

exports.forgotPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Please enter your email"));
  }
  const email = req.body.email.toLowerCase();
  const store = await storeModel.findOne({ email: email });
  if (!store) {
    return next(new ErrorHandler(400, "The email you enter not found"));
  }

  const resetOTP = await store.getResetPasswordOPT();

  const obj = await store.save({ validateBeforeSave: false });
  if (obj) {
    const resetPasswordOTP = `${resetOTP}`;
    const message = `your reset password OTP is :- \n\n${resetPasswordOTP}\n\n
        if you have not requested this email then please ignore it`;
    try {
      const htmlTemplate = fs.readFileSync(
        "./template/04-forgot-password.html",
        "utf8"
      );
      const compiledTemplate = handlebars.compile(htmlTemplate);
      const htmlModified = compiledTemplate({
        resetPasswordOTP: resetPasswordOTP,
      });

      try {
        await sendEmailWithTemplate({
          email: store.email,
          subject: "Skip A Line",
          htmlModified,
        });
        res.status(200).json({
          success: true,
          message: "OTP for password recovery is sent on your email",
          store,
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        throw new ErrorHandler(
          "Error sending email. Please try again later.",
          500
        );
      }
    } catch (error) {
      store.resetPasswordOTP = undefined;
      store.resetPasswordExpire = undefined;
      await store.save({ validateBeforeSave: false });
      return next(new ErrorHandler(error.message, 500));
    }
  }
});
const sendOTPForEmailVerification = async (
  { _id, email },
  res,
  msg,
  token,
  isSend
) => {
  let store;
  try {
    store = await storeModel.findById(_id);
    if (!store) {
      res.status(400).json({ success: false, message: "store not found" });
    }
    const emailVerifyOTP = store.getEmailVerificationOPT();
    await store.save({ validateBeforeSave: false });
    const message = `your email verification OTP is :- \n\n${emailVerifyOTP}\n\n
            if you have not requested this email then please ignore it`;

    const htmlTemplate = fs.readFileSync(
      "./template/02-email-verification.html",
      "utf8"
    );
    const compiledTemplate = handlebars.compile(htmlTemplate);
    const htmlModified = compiledTemplate({
      verificationCode: emailVerifyOTP,
    });

    sendEmailWithTemplate({
      email: store.email,
      subject: "Skip A Line",
      message,
      htmlModified,
    });

    res.status(200).json({ success: false, token, message: msg, store });
  } catch (error) {
    store.emailverifyOTP = undefined;
    store.emailVerifyOTPExpire = undefined;
    await store.save({ validateBeforeSave: false });
    res
      .status(400)
      .json({ success: false, message: error.message, stack: error.stack });
  }
};

exports.resendEmailVerificationOTP = asyncErrorCatch(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ErrorHandler(400, "Please provide your email"));
  }

  const store = await storeModel.findOne({ email: email.toLowerCase() });
  if (!store) {
    return next(new ErrorHandler(400, "Store not found with this email"));
  }

  // Check if the store is blocked
  if (store.isStoreBlock) {
    return next(
      new ErrorHandler(
        400,
        "Sorry you are not able to register using this email"
      )
    );
  }

  const emailVerifyOTP = store.getEmailVerificationOPT();
  await store.save({ validateBeforeSave: false });

  const message = `Your email verification OTP is: \n\n${emailVerifyOTP}\n\nIf you have not requested this email then please ignore it.`;

  const htmlTemplate = fs.readFileSync(
    "./template/02-email-verification.html",
    "utf8"
  );
  const compiledTemplate = handlebars.compile(htmlTemplate);
  const htmlModified = compiledTemplate({
    verificationCode: emailVerifyOTP,
  });

  try {
    await sendEmailWithTemplate({
      email: store.email,
      subject: "Skip A Line",
      message,
      htmlModified,
    });

    res.status(200).json({
      success: true,
      message: "OTP has been resent to your email",
    });
  } catch (error) {
    store.emailVerifyOTP = undefined;
    store.emailVerifyOTPExpire = undefined;
    await store.save({ validateBeforeSave: false });

    res.status(500).json({
      success: false,
      message: "There was an error sending the email. Please try again later.",
      error: error.message,
    });
  }
});

// exports.verifyStoreEmailVerificationOTP = asyncErrorCatch(
//   async (req, res, next) => {
//     if (!req.body.OTP) {
//       return next(new ErrorHandler(400, "Please enter email verification OTP"));
//     }
//     if (!req.body._id) {
//       return next(new ErrorHandler(400, "Please enter store Id"));
//     }

//     const emailverifyOTP = crypto
//       .createHash("sha256")
//       .update(req.body.OTP)
//       .digest("hex");
//     const store = await storeModel.findOne({
//       emailverifyOTP,
//       _id: req.body._id,
//       emailVerifyOTPExpire: { $gt: Date.now() },
//     });
//     if (!store) {
//       return next(new ErrorHandler(400, "Your OTP was expired"));
//     }
//     store.isEmailVerified = true;
//     const obj = await store.save({ validateBeforeSave: false });
//     if (!obj) {
//       return next(new ErrorHandler(400, "Email Not Verified"));
//     }
//     const url = `http://localhost:5001/api/v1/payment/connect-stripe-account/${store._id}`;

//     const message = `You have one last step left! Please click on the link to connect your stripe account ${url}`;
//     await sendEmailTostore({
//       email: store.email,
//       subject: "E-Store",
//       message,
//       html: userWelcomeEmailTemplate({ url }),
//     });
//     res
//       .status(200)
//       .json({ success: true, message: "Email verified", store: store });
//   }
// );
exports.verifyStoreEmailVerificationOTP = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.OTP) {
      return next(new ErrorHandler(400, "Please enter email verification OTP"));
    }
    if (!req.body._id) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }

    const emailverifyOTP = crypto
      .createHash("sha256")
      .update(req.body.OTP)
      .digest("hex");

    const store = await storeModel.findOne({
      emailverifyOTP,
      _id: req.body._id,
      emailVerifyOTPExpire: { $gt: Date.now() },
    });

    if (!store) {
      return next(new ErrorHandler(400, "Your OTP was expired"));
    }

    store.isEmailVerified = true;
    const obj = await store.save({ validateBeforeSave: false });

    if (!obj) {
      return next(new ErrorHandler(400, "Email Not Verified"));
    }

    // After email verification, automatically send phone verification OTP
    const phoneVerifyOTP = store.getPhoneVerificationOTP();
    await store.save({ validateBeforeSave: false });

    const smsMessage = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;

    try {
      await sendSMS(store.number, smsMessage);

      // const url = `http://localhost:5001/api/v1/payment/connect-stripe-account/${store._id}`;
      // const emailMessage = `You have one last step left! Please click on the link to connect your stripe account ${url}`;
      // await sendEmailTostore({
      //   email: store.email,
      //   subject: "E-Store",
      //   message: emailMessage,
      //   html: userWelcomeEmailTemplate({ url }),
      // });

      res.status(200).json({
        success: true,
        message: "Email verified. Please verify your phone number.",
        requiresPhoneVerification: true,
        store: {
          _id: store._id,
          number: store.number,
        },
      });
    } catch (error) {
      store.phoneVerifyOTP = undefined;
      store.phoneVerifyOTPExpire = undefined;
      await store.save({ validateBeforeSave: false });
      return next(
        new ErrorHandler(500, "Error sending SMS. Please try again later.")
      );
    }
  }
);

exports.verifyResetPasswordOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.OTP) {
    return next(new ErrorHandler(400, "Please enter forgot password OTP"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  const resetPasswordOTP = crypto
    .createHash("sha256")
    .update(req.body.OTP)
    .digest("hex");
  const store = await storeModel.findOne({
    resetPasswordOTP,
    _id: req.body._id,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!store) {
    return next(new ErrorHandler(400, "Your OTP was expired"));
  }
  res
    .status(200)
    .json({ success: true, message: "OTP verified", store: store });
});

exports.resetPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.password) {
    return next(new ErrorHandler(400, "Please enter new password"));
  }
  if (!req.body.confirmPassword) {
    return next(new ErrorHandler(400, "Please enter confirm password"));
  }
  if (!req.body.email) {
    return next(new ErrorHandler(400, "please enter email"));
  }
  const email = req.body.email.toLowerCase();
  const store = await storeModel.findOne({ email: email });
  console.log(store);
  if (!store) {
    return next(new ErrorHandler(400, "store not found"));
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler(400, "password and confirm password not matched")
    );
  }
  store.resetPasswordExpire = undefined;
  store.resetPasswordOTP = undefined;
  store.password = req.body.password;

  const obj = await store.save({ validateBeforeSave: false });
  if (!obj) {
    return next(new ErrorHandler(400, "Password not updated"));
  }
  res.status(200).json({ success: true, message: "password updated", store });
});

exports.getstoreOwnProfile = asyncErrorCatch(async (req, res, next) => {
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  const store = await storeModel.findById(req.body._id);
  if (!store) {
    return next(new ErrorHandler(401, "store not found"));
  }
  return res.status(200).json({
    success: true,
    store,
    message: "Store detail fetched successfully",
  });
});

exports.updatestoreOwnPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.oldPassword) {
    return next(new ErrorHandler(400, "Please enter your old password"));
  }
  if (!req.body.newPassword) {
    return next(new ErrorHandler(400, "Please enter your new pasword"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter Store Id"));
  }
  const { oldPassword, newPassword } = req.body;
  const store = await storeModel.findById(req.body._id).select("+password");
  const isPasswordMatched = await store.comparePassword(oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler(401, "old password does not match"));
  }
  store.password = newPassword;
  await store.save({ validateBeforeSave: false });
  return res.status(200).json({ success: true, msg: "password updated" });
});

exports.updateStoreOwnProfile = asyncErrorCatch(async (req, res, next) => {
  // }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  const store = await storeModel.findById(req.body._id);
  if (!store) {
    return next(new ErrorHandler(400, "store not found"));
  }

  const Data = {
    name: req.body.name,
    number: req.body.number,
    address: req.body.address,
    storeCategoryType: req.body.storeCategoryType,
    profile: !req.files?.storeProfile ? "" : req.files?.storeProfile[0].path,
    document: !req.files?.storeDocument ? "" : req.files?.storeDocument[0].path,
    coverPhoto: !req.files?.storeCover ? "" : req.files?.storeCover[0].path,
    // location: {
    //     type: 'Point',
    //     coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
    // },
  };
  console.log(Data);
  if (req.files?.storeDocument) {
    (Data.isDocumentVerified = false), (Data.documentStatus = "pending");
  }

  if (req.body.latitude && req.body.longitude) {
    Data.location = {
      type: "Point",
      coordinates: [
        parseFloat(req.body.longitude),
        parseFloat(req.body.latitude),
      ],
    };
  }
  const newData = await isObjectPropertyEmpty(Data, store);
  // console.log(newData);
  storeModel.findByIdAndUpdate(
    req.body._id,
    newData,
    { runValidators: true },
    async (err, result) => {
      if (err) {
        if (req?.files?.storeProfile) {
          fs.unlinkSync(req.files.storeProfile[0].path);
        }
        if (req?.files?.storeDocument) {
          fs.unlinkSync(req.files.storeDocument[0].path);
        }
        if (req?.files?.storeCover) {
          fs.unlinkSync(req.files.storeCover[0].path);
        }
        return next(new ErrorHandler(400, err.message));
      } else {
        if (req.files?.storeProfile) {
          fs.unlinkSync(result.profile);
        }
        if (req.files?.storeDocument) {
          fs.unlinkSync(result.document);
        }
        if (req?.files?.storeCover) {
          fs.unlinkSync(result.coverPhoto);
        }
        const store = await storeModel.findById(req.body._id);
        res
          .status(200)
          .json({ success: true, msg: "store profile updated", store });
      }
    }
  );
});

// create a review
exports.createReview = asyncErrorCatch(async (req, res, next) => {
  const review = {
    user: req.body.user,
    rating: Number(req.body.rating),
    comment: req.body.comment,
    store: req.body.store,
  };

  const store = await storeModel.findById(req.body.store);

  store.reviews.push(review);
  store.numOfReviews = store.reviews.length;

  let avg = 0;

  store.reviews.forEach((rev) => {
    avg += rev.rating;
  });

  store.ratings = avg / store.reviews.length;

  store.save({ validateBeforeSave: false }, (err, result) => {
    if (err) {
      return next(new ErrorHandler(400, err.message));
    } else {
      res.status(200).json({
        success: true,
        message: "Review created",
      });
    }
  });
});

exports.getStoreReviews = asyncErrorCatch(async (req, res, next) => {
  const store = await storeModel.findById(req.body.store).populate({
    path: "reviews.user",
    select: "name email profile",
  });
  if (!store) {
    return next(new ErrorHandler(404, "store not found"));
  }

  res.status(200).json({
    success: true,
    reviews: store,
    message: "Store reviews fetched successfully",
  });
});

exports.getAllstores = asyncErrorCatch(async (req, res, next) => {
  const { userLatitude, userLongitude } = req.body;

  if (!userLatitude) {
    return next(new ErrorHandler(400, "Please enter user latitude"));
  }

  if (!userLongitude) {
    return next(new ErrorHandler(400, "Please enter user longitude"));
  }

  const stores = await storeModel.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [userLongitude, userLatitude],
        },
        distanceField: "distance",
        maxDistance: 50000,
        spherical: true,
      },
    },
    {
      $project: {
        distance: { $divide: ["$distance", 1609.34] },
        name: 1,
        address: 1,
        location: 1,
      },
    },
  ]);

  if (stores.length === 0) {
    return next(new ErrorHandler(400, "No store found"));
  }

  res.status(200).json({
    success: true,
    stores,
    message: "All stores fetched successfully",
  });
});

exports.getAllNearestStores = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.latitude) {
    return next(new ErrorHandler(400, "Please enter user latitude"));
  }
  if (!req.body.longitude) {
    return next(new ErrorHandler(400, "Please enter user longitude"));
  }

  const { latitude, longitude } = req.body;

  const stores = await storeModel.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      },
    },
  });

  const storesWithDistance = stores.map((store) => {
    const storeLat = store.location.coordinates[1];
    const storeLng = store.location.coordinates[0];

    const distance = geolib.getDistance(
      { latitude: latitude, longitude: longitude },
      { latitude: storeLat, longitude: storeLng }
    );

    // Add the distance field to the store object
    return Object.assign(store.toObject(), {
      distance: (distance / 1609.34).toFixed(2), // Convert meters to miles
    });
  });

  res.status(200).json({
    success: true,
    stores: storesWithDistance,
    message: "All stores fetched successfully",
  });
});

// super admin
exports.getAllstoresByAdmin = asyncErrorCatch(async (req, res, next) => {
  const stores = await storeModel
    .find()
    .sort({ createdAt: -1 })
    .select("+isEmailVerified")
    .select("+isDocumentVerified");
  if (!stores) {
    return next(new ErrorHandler(400, "No store Found"));
  }
  res.status(200).json({
    success: true,
    stores,
    message: "All stores fetched successfully",
  });
});

exports.getAllstoresByAdminWhoAreNotVerified = asyncErrorCatch(
  async (req, res, next) => {
    const startDate = req?.query?.startDate;
    const endDate = req?.query?.endDate;

    const query = { isDocumentVerified: false, isEmailVerified: true };

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const stores = await storeModel
      .find(query, { emailVerifyOTPExpire: 0, emailverifyOTP: 0, reviews: 0 })
      .sort({ createdAt: -1 })
      .select("+isEmailVerified")
      .select("+isDocumentVerified")
      .populate({ path: "storeCategoryType", select: "storeCategoryType" });
    if (!stores) {
      return next(new ErrorHandler(400, "No store Found"));
    }
    res.status(200).json({
      success: true,
      stores,
      message: "All stores fetched successfully",
    });
  }
);

exports.getAllstoresByAdminWhoAreVerified = asyncErrorCatch(
  async (req, res, next) => {
    const startDate = req?.query?.startDate;
    const endDate = req?.query?.endDate;

    const query = { isDocumentVerified: true, isEmailVerified: true };

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    console.log(req.query);
    const stores = await storeModel
      .find(query, { emailVerifyOTPExpire: 0, emailverifyOTP: 0, reviews: 0 })
      .sort({ verifiedAt: -1 })
      .select("+isEmailVerified")
      .select("+isDocumentVerified")
      .populate({ path: "storeCategoryType", select: "storeCategoryType" });
    if (!stores) {
      return next(new ErrorHandler(400, "No store Found"));
    }
    res.status(200).json({
      success: true,
      stores,
      message: "All stores fetched successfully",
    });
  }
);

exports.updatestoreStatusByAdmin = asyncErrorCatch(async (req, res, next) => {
  const store = await storeModel.findById(req.params.id);
  if (!store) {
    return next(new ErrorHandler(404, "Store not found"));
  }
  console.log(req.body.status);
  const formatter = new Intl.DateTimeFormat("en", { month: "long" });
  const month1 = formatter.format(new Date());
  const Data = {
    isDocumentVerified: req.body?.isDocumentVerified,
    isStoreBlock:
      req.body.status === "blocked"
        ? true
        : req.body.status === "active"
        ? false
        : false,
    // accessLevel: req.body.accessLevel || (req.body?.isDocumentVerified && req.body?.status !== "blocked") ? 0 : 1,
    updatedAt: month1,
  };
  if (
    req.body.status === "verified" ||
    req.body.status === "rejected" ||
    req.body.status === "pending"
  ) {
    console.log("inside");
    Data.documentStatus = req.body.status;
  }
  if (req.body.status === "blocked") {
    Data.blockedAt = new Date(Date.now());
  }
  if (req.body.status === "verified") {
    Data.verifiedAt = new Date(Date.now());
  }
  console.log(Data, "dat");

  const newData = await isObjectPropertyEmpty(Data, store);
  storeModel.findByIdAndUpdate(req.params.id, newData, (err, result) => {
    if (err) {
      return next(new ErrorHandler(400, "Store Not Found"));
    } else {
      const message = "";
      notificationMsg = "";
      if (req.body.status === "blocked") {
        notificationMsg =
          "We hope this message finds you well. We wanted to inform you that your account on Skip A Line has been temporarily blocked by our administration team. This action has been taken due to a violation of our platform's terms of use or community guidelines.";
      } else if (req.body.status === "active") {
        notificationMsg =
          "We're pleased to inform you that your account on Skip A Line has been successfully reactivated by our administration team. We apologize for any inconvenience the temporary suspension may have caused.";
      } else if (req.body.status === "verified") {
        notificationMsg =
          "We're pleased to inform you that your submitted documents have been successfully verified by our administration team. Your account on Skip A Line is now fully verified, and you can access all features and benefits available to verified users.";
      } else if (req.body.status === "rejected") {
        notificationMsg =
          "We regret to inform you that your submitted documents have not been approved during the verification process. Our administration team found discrepancies or issues with the provided information, leading to the rejection of your verification.";
      }

      const htmlTemplate = fs.readFileSync(
        "./template/03-unsubscribe.html",
        "utf8"
      );
      const compiledTemplate = handlebars.compile(htmlTemplate);
      const htmlModified = compiledTemplate({
        notificationMsg,
      });

      sendEmailWithTemplate({
        email: store.email,
        subject: "Skip A Line",
        message,
        htmlModified,
      });
      return res
        .status(200)
        .json({ success: true, msg: ` ${req.body.status}` });
    }
  });
});

exports.getSinglestoreDetail = asyncErrorCatch(async (req, res, next) => {
  const store = await storeModel
    .findById(req.params.id)
    .select("+isEmailVerified")
    .select("+isDocumentVerified")
    .lean();

  if (!store) {
    return next(new ErrorHandler(400, "No store found"));
  } else {
    const recentOrders = await orderModel
      .find({ store: req.params.id })
      .populate("user orderStatus")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log("recentOrders", recentOrders);

    store.recentOrders = recentOrders; // Assign recentOrders array to the store object
    const orders = await orderModel
      .find({ store: req.params.id })
      .populate({ path: "orderStatus" });
    if (!orders) {
      return next(new ErrorHandler(400, "No order Found"));
    }

    let totalPrice = 0,
      totalOrders = 0,
      completedOrders = 0,
      inProgress = 0,
      paid = 0,
      ready = 0;
    for (let order of orders) {
      totalPrice += order.totalPrice;
      totalOrders = orders?.length;
      if (order?.orderStatus?.statusType === "Completed") {
        completedOrders += 1;
      }
      if (order?.orderStatus?.statusType === "In Progress") {
        inProgress += 1;
      }
      if (order?.orderStatus?.statusType === "Ready") {
        ready += 1;
      }
      if (order?.orderStatus?.statusType === "Paid") {
        paid += 1;
      }
    }
    res.status(200).json({
      success: true,
      store,
      totalEarning: totalPrice.toFixed(2),
      totalOrders,
      completedOrders,
      inProgress,
      paid,
      ready,
    });
    // res
    //     .status(200)
    //     .json({ success: true, store, message: "Store detail fetched successfully" });
  }
});

exports.getSinglestoreDetailByUser = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "please enter store Id"));
  }
  const store = await storeModel.findById(req.body.store);
  if (!store) {
    return next(new ErrorHandler(404, "No store Found"));
  }
  res.status(200).json({
    success: true,
    store,
    message: "Store detail fetched successfully",
  });
});
exports.getStoreDocument = asyncErrorCatch(async (req, res, next) => {
  const store = await storeModel.findOne(
    { _id: req.params.id },
    { document: 1 }
  );
  if (!store) {
    return next(new ErrorHandler(404, "No store Found"));
  }
  res.status(200).json({ success: true, store });
});
exports.getTotalNumberOfStores = asyncErrorCatch(async (req, res, next) => {
  const totalStores = await storeModel.count();
  console.log(totalStores);
  res.status(200).json({ success: true, totalStores });
});

exports.getTotalNumberOfStoresNotVerified = asyncErrorCatch(
  async (req, res, next) => {
    const totalStoresNotVerified = await storeModel
      .find({ isDocumentVerified: false })
      .count();
    //console.log(totalStoresNotVerified);
    res.status(200).json({ success: true, totalStoresNotVerified });
  }
);

exports.getTotalNumberofVerifiedStores = asyncErrorCatch(
  async (req, res, next) => {
    const verifiedStores = await storeModel
      .find({ isDocumentVerified: true })
      .count();
    res.status(200).json({ success: true, verifiedStores });
  }
);

exports.getTotalNumberofVerifiedStores = asyncErrorCatch(
  async (req, res, next) => {
    const verifiedStores = await storeModel
      .find({ isDocumentVerified: true })
      .count();
    res.status(200).json({ success: true, verifiedStores });
  }
);

exports.getTotalNumberOfStoresBlock = asyncErrorCatch(
  async (req, res, next) => {
    const blockedStores = await storeModel.find({ status: "blocked" }).count();
    console.log(blockedStores);
    res.status(200).json({ success: true, blockedStores });
  }
);

exports.getStoreStatistics = asyncErrorCatch(async (req, res, next) => {
  const statistics = await storeModel.aggregate([
    {
      $group: {
        _id: null,
        totalStores: { $sum: 1 },
        totalStoresNotVerified: {
          $sum: { $cond: [{ $eq: ["$isDocumentVerified", false] }, 1, 0] },
        },
        verifiedStores: {
          $sum: { $cond: [{ $eq: ["$isDocumentVerified", true] }, 1, 0] },
        },
        blockedStores: {
          $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] },
        },
      },
    },
  ]);

  const { totalStores, totalStoresNotVerified, verifiedStores, blockedStores } =
    statistics[0];

  res.status(200).json({
    success: true,
    totalStores,
    totalStoresNotVerified,
    verifiedStores,
    blockedStores,
  });
});

// combined monthly blocked and verified data starts
exports.getTotalNumberOfStoresByMonth = asyncErrorCatch(
  async (req, res, next) => {
    const currentDate = new Date();
    const lastFourMonths = [];
    for (let i = 3; i >= 0; i--) {
      const monthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthName = monthDate.toLocaleString("default", { month: "long" });
      lastFourMonths.push(monthName);
    }
    let toatalBlockedStores = [2, 1, 0, 3];
    const stores = await storeModel.find({ isStoreBlock: true });
    if (!stores) {
      return next(new ErrorHandler(404, "No store Found"));
    }
    stores.map((store) => {
      const date = new Date(`${store?.blockedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalBlockedStores[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalBlockedStores[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalBlockedStores[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalBlockedStores[3] += 1;
      }
    });
    let toatalVerifiedStores = [2, 1, 2, 7];
    const verifiedStores = await storeModel.find({
      isDocumentVerified: true,
      isEmailVerified: true,
    });
    if (!stores) {
      return next(new ErrorHandler(404, "No store Found"));
    }
    verifiedStores.map((store) => {
      const date = new Date(`${store?.verifiedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalVerifiedStores[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalVerifiedStores[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalVerifiedStores[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalVerifiedStores[3] += 1;
      }
    });
    res.status(200).json({
      success: true,
      toatalVerifiedStores,
      toatalBlockedStores,
      lastFourMonths,
    });
  }
);

exports.getTotalNumberOfStoresBlockByMonth = asyncErrorCatch(
  async (req, res, next) => {
    // get the current date
    const currentDate = new Date();

    // create an array to hold the last four months
    const lastFourMonths = [];

    // loop over the last four months (including the current month) and push their names into the array
    for (let i = 3; i >= 0; i--) {
      // get the date object for the current month, relative to the current date
      const monthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );

      // get the name of the current month
      const monthName = monthDate.toLocaleString("default", { month: "long" });
      // push the month name into the array
      lastFourMonths.push(monthName);
    }
    let toatalBlockedStores = [1, 2, 0, 3];
    const stores = await storeModel.find({ isStoreBlock: true });
    if (!stores) {
      return next(new ErrorHandler(404, "No store Found"));
    }
    stores.map((store) => {
      const date = new Date(`${store?.blockedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalBlockedStores[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalBlockedStores[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalBlockedStores[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalBlockedStores[3] += 1;
      }
    });
    res
      .status(200)
      .json({ success: true, toatalBlockedStores, lastFourMonths });
  }
);

function getMonthNameFromDate(date) {
  const options = { month: "long" };
  return date.toLocaleString("en-US", options);
}

exports.getTotalNumberOfstoresByAdminWhoAreVerified = asyncErrorCatch(
  async (req, res, next) => {
    // get the current date
    const currentDate = new Date();

    // create an array to hold the last four months
    const lastFourMonths = [];

    // loop over the last four months (including the current month) and push their names into the array
    for (let i = 3; i >= 0; i--) {
      // get the date object for the current month, relative to the current date
      const monthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );

      // get the name of the current month
      const monthName = monthDate.toLocaleString("default", { month: "long" });

      // push the month name into the array
      lastFourMonths.push(monthName);
    }

    let toatalVerifiedStores = [1, 2, 0, 1];

    const stores = await storeModel.find({
      isDocumentVerified: true,
      isEmailVerified: true,
    });
    if (!stores) {
      return next(new ErrorHandler(404, "No store Found"));
    }

    stores.map((store) => {
      const date = new Date(`${store?.verifiedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalVerifiedStores[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalVerifiedStores[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalVerifiedStores[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalVerifiedStores[3] += 1;
      }
    });

    res
      .status(200)
      .json({ success: true, toatalVerifiedStores, lastFourMonths });
  }
);

// VERIFICATION

exports.verifyStore = asyncErrorCatch(async (req, res, next) => {
  return res.status(200).json({ success: true, message: "token verified" });
});

// Tax and Platform fee controller

exports.getStoreFees = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Fetch store details
    const store = await storeModel
      .findById(storeId)
      .populate("storeCategoryType");
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    }

    // Fetch service charges based on store ID
    const serviceChargesData = await ServiceCharges.findOne({
      "storesData.storeId": storeId,
    });

    let serviceCharges;
    if (serviceChargesData) {
      const storeServiceData = serviceChargesData.storesData.find(
        (data) => data.storeId === storeId
      );
      serviceCharges = storeServiceData
        ? storeServiceData.serviceCharges
        : serviceChargesData.defaultServiceCharges;
    } else {
      // If service charges data is not found, set default service charges
      const defaultChargesData = await ServiceCharges.findOne();
      serviceCharges = defaultChargesData
        ? defaultChargesData.defaultServiceCharges
        : 0;
    }

    // Fetch tax based on store state
    const taxData = await TaxManagement.findOne({
      state: store.state,
    });

    const tax = taxData ? taxData.tax : 0;

    // Return the fees
    return res.status(200).json({
      success: true,
      data: {
        storeId: storeId,
        serviceCharges,
        tax,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.sendPhoneVerificationOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.number) {
    return next(new ErrorHandler(400, "Please provide your phone number"));
  }

  const store = await storeModel.findById(req.body._id);
  if (!store) {
    return next(new ErrorHandler(404, "Store not found"));
  }

  const phoneVerifyOTP = store.getPhoneVerificationOTP();
  await store.save({ validateBeforeSave: false });

  const message = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;

  try {
    await sendSMS(req.body.number, message);

    res.status(200).json({
      success: true,
      message: "Verification code sent to your phone number",
      store: {
        _id: store._id,
        number: store.number,
      },
    });
  } catch (error) {
    store.phoneVerifyOTP = undefined;
    store.phoneVerifyOTPExpire = undefined;
    await store.save({ validateBeforeSave: false });

    return next(
      new ErrorHandler(500, "Error sending SMS. Please try again later.")
    );
  }
});

exports.verifyPhoneOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.OTP) {
    return next(new ErrorHandler(400, "Please enter phone verification OTP"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }

  const phoneVerifyOTP = crypto
    .createHash("sha256")
    .update(req.body.OTP)
    .digest("hex");

  const store = await storeModel.findOne({
    phoneVerifyOTP,
    _id: req.body._id,
    phoneVerifyOTPExpire: { $gt: Date.now() },
  });

  if (!store) {
    return next(new ErrorHandler(400, "Invalid OTP or OTP has expired"));
  }

  store.isPhoneVerified = true;
  store.phoneVerifyOTP = undefined;
  store.phoneVerifyOTPExpire = undefined;

  await store.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Phone number verified successfully",
    store,
  });
});

exports.resendPhoneVerificationOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.number) {
    return next(new ErrorHandler(400, "Please provide your phone number"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please provide store ID"));
  }

  const store = await storeModel.findOne({
    _id: req.body._id,
    number: req.body.number,
  });

  if (!store) {
    return next(
      new ErrorHandler(404, "Store not found with this phone number")
    );
  }

  if (store.isPhoneVerified) {
    return next(new ErrorHandler(400, "Phone number is already verified"));
  }

  const phoneVerifyOTP = store.getPhoneVerificationOTP();
  await store.save({ validateBeforeSave: false });

  const message = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;

  try {
    await sendSMS(store.number, message);

    res.status(200).json({
      success: true,
      message: "New verification code sent to your phone number",
    });
  } catch (error) {
    store.phoneVerifyOTP = undefined;
    store.phoneVerifyOTPExpire = undefined;
    await store.save({ validateBeforeSave: false });

    return next(
      new ErrorHandler(500, "Error sending SMS. Please try again later.")
    );
  }
});
