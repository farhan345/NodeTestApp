const handlebars = require("handlebars");
const userModel = require("../models/user");
const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const fs = require("fs");
const files = require("fs").promises;
const sendToken = require("../utils/getJwtToken");
const sendEmailToUser = require("../utils/sendMail");
const asyncErrorHandlers = require("../middleware/asyncErrorHandlers");
const crypto = require("crypto");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const { log } = require("console");
const orderModel = require("../models/order");
const sendEmailWithTemplate = require("../utils/sendEmailWithTemplate");
const sendSMS = require("../utils/sendSms");

exports.userRegister = async (req, res, next) => {
  const msg = "Verification codes have been sent to your email and phone";

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
  if (!req.body.address) {
    return next(new ErrorHandler(400, "Please enter your address"));
  }
  if (!req.file?.path) {
    return next(new ErrorHandler(400, "Please select your profile picture"));
  }

  const Data = {
    name: req.body.name,
    password: req.body.password,
    email: req.body.email.toLowerCase(),
    address: req.body.address,
    number: req.body.number,
    profile: req.file.path,
  };

  try {
    const oldUser = await userModel.findOne({ email: req.body.email });
    if (oldUser) {
      await cleanupFiles(req.file);
      return next(
        new ErrorHandler(400, "User already registered with this email")
      );
    }

    // Create new user
    const result = await userModel.create(Data);
    const token = "";
    let profile = formatFilePath(result?.profile);
    result.profile = profile;

    // Send both email and phone verification codes
    try {
      // Send email verification
      const emailVerifyOTP = result.getEmailVerificationOPT();
      const emailMessage = `Your email verification OTP is: ${emailVerifyOTP}`;
      const htmlTemplate = fs.readFileSync(
        "./template/02-email-verification.html",
        "utf8"
      );
      const compiledTemplate = handlebars.compile(htmlTemplate);
      const htmlModified = compiledTemplate({
        verificationCode: emailVerifyOTP,
      });

      await sendEmailWithTemplate({
        email: result.email,
        subject: "E-Store - Email Verification",
        message: emailMessage,
        htmlModified,
      });

      // Send phone verification
      const phoneVerifyOTP = result.getPhoneVerificationOTP();
      const smsMessage = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;
      // await sendSMS(result.number, smsMessage);

      await result.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: true,
        token,
        message: msg,
        user: result,
      });
    } catch (error) {
      result.emailverifyOTP = undefined;
      result.emailVerifyOTPExpire = undefined;
      result.phoneVerifyOTP = undefined;
      result.phoneVerifyOTPExpire = undefined;
      await result.save({ validateBeforeSave: false });
      return next(new ErrorHandler(500, "Error sending verification codes"));
    }
  } catch (err) {
    await cleanupFiles(req.file);
    return next(new ErrorHandler(400, err.message));
  }
};

async function cleanupFiles(file) {
  try {
    if (file?.path) {
      await files.unlink(file.path);
    }
    if (file?.thumbnail?.path) {
      await files.unlink(file.thumbnail.path);
      //await fs.rm(path.dirname(file.thumbnail.path), { recursive: true, force: true });
    }
  } catch (cleanupError) {
    console.error(`Error during cleanup: ${cleanupError.message}`);
  }
}

exports.registerUserDocument = asyncErrorCatch(async (req, res, next) => {
  if (!req?.file?.path) {
    return next(
      new ErrorHandler(400, "Please select file that you want to be verified")
    );
  }
  const user = await userModel.findById(req.body._id);
  if (!user) {
    return next(new ErrorHandler(400, "User not found"));
  }

  const Data = {
    document: req?.file?.path,
    isDocumentVerified: req?.file?.path ? false : true,
    accessLevel: req?.file?.path ? 1 : 0,
  };
  const newData = await isObjectPropertyEmpty(Data, user);
  userModel.findByIdAndUpdate(
    req.body._id,
    newData,
    { runValidators: true },
    async (err, result) => {
      if (err) {
        fs.unlinkSync(req?.file?.path);
        return next(err);
      } else {
        if (req?.file?.path && result?.document) {
          fs.unlinkSync(result?.document);
        }

        let notificationMsg =
          "Thank you for submitting your documents for verification on Skip A Line. Our administration team will now review the documents you have submitted. Please allow some time for the review to be completed.";

        const htmlTemplate = fs.readFileSync(
          "./template/03-unsubscribe.html",
          "utf8"
        );
        const compiledTemplate = handlebars.compile(htmlTemplate);
        const htmlModified = compiledTemplate({
          notificationMsg,
        });

        sendEmailWithTemplate({
          email: user.email,
          subject: "Skip A Line",
          message,
          htmlModified,
        });
        return res
          .status(200)
          .json({ success: true, message: "Document submit for verification" });
      }
    }
  );
});

exports.userLogin = asyncErrorCatch(async (req, res, next) => {
  const msg = "Please verify both your email and phone number to continue";

  if (!req.body.password) {
    return next(new ErrorHandler(400, "Please enter your password"));
  }
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Please enter your email"));
  }

  const { password } = req.body;
  const email = req.body.email.toLowerCase();

  if (!email || !password) {
    return next(new ErrorHandler(400, "Please enter email and password"));
  }

  const user = await userModel.findOne({ email: email }).select("+password");
  if (!user) {
    return next(new ErrorHandler(401, "Invalid Email or Password"));
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler(401, "Invalid Email or Password"));
  }

  if (user.isUserBlock === true) {
    return next(
      new ErrorHandler(400, "Sorry, your account has been blocked by admin")
    );
  }

  const token = "";

  // Check both email and phone verification
  if (!user.isEmailVerified || !user.isPhoneVerified) {
    // Send verification codes for unverified channels
    try {
      if (!user.isEmailVerified) {
        const emailVerifyOTP = user.getEmailVerificationOPT();
        const emailMessage = `Your email verification OTP is: ${emailVerifyOTP}`;
        const htmlTemplate = fs.readFileSync(
          "./template/02-email-verification.html",
          "utf8"
        );
        const compiledTemplate = handlebars.compile(htmlTemplate);
        const htmlModified = compiledTemplate({
          verificationCode: emailVerifyOTP,
        });

        await sendEmailWithTemplate({
          email: user.email,
          subject: "E-Store - Email Verification",
          message: emailMessage,
          htmlModified,
        });
      }

      if (!user.isPhoneVerified) {
        const phoneVerifyOTP = user.getPhoneVerificationOTP();
        const smsMessage = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;
        await sendSMS(user.number, smsMessage);
      }

      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: false,
        token,
        message: msg,
        user,
        needsEmailVerification: !user.isEmailVerified,
        needsPhoneVerification: !user.isPhoneVerified,
      });
    } catch (error) {
      user.emailverifyOTP = undefined;
      user.emailVerifyOTPExpire = undefined;
      user.phoneVerifyOTP = undefined;
      user.phoneVerifyOTPExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new ErrorHandler(500, "Error sending verification codes"));
    }
  }

  const user2 = await userModel.findOne({ email: email });
  sendToken(res, 200, user2, "Login Successfully");
});

exports.Logout = asyncErrorCatch(async (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, msg: "user logout successfully" });
});

exports.forgotPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Please enter your email"));
  }
  const email = req.body.email.toLowerCase();

  const user = await userModel.findOne({ email: email });
  if (!user) {
    return next(new ErrorHandler(400, "user not founds"));
  }

  const resetOTP = await user.getResetPasswordOPT();

  await user.save({ validateBeforeSave: false });
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

    sendEmailWithTemplate({
      email: user.email,
      subject: "Skip A Line",
      message,
      htmlModified,
    });
    res.status(200).json({
      success: true,
      message: "OTP for password recovery is send on your email",
      user,
    });
  } catch (error) {
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler(error.message, 500));
  }
});
const sendOTPForEmailVerification = async (
  { _id, email },
  res,
  msg,
  token,
  isSend
) => {
  let user;
  try {
    user = await userModel.findById(_id);
    if (!user) {
      res.status(400).json({ success: false, message: "user not found" });
    }
    const emailVerifyOTP = user.getEmailVerificationOPT();
    await user.save({ validateBeforeSave: false });
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
      email: user.email,
      subject: "E-Store",
      message,
      htmlModified,
    })
      .then((data) => {})
      .catch((error) => {});
    let profile = formatFilePath(user?.profile);
    user.profile = profile;
    res.status(200).json({ success: true, token, message: msg, user });
  } catch (error) {
    console.log(error);
    user.emailverifyOTP = undefined;
    user.emailVerifyOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resendOTP = asyncErrorCatch(async (req, res, next) => {
  // debugger;
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Kinldy provide an email!"));
  }
  const isUser = await userModel.findOne({ email: req.body.email });
  if (!isUser) {
    return next(new ErrorHandler(400, "User not Found"));
  }
  if (isUser.isEmailVerified) {
    return next(new ErrorHandler(400, "Your email is already verified!"));
  }
  const emailVerifyOTP = isUser.getEmailVerificationOPT();
  await isUser.save({ validateBeforeSave: false });
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
    email: isUser.email,
    subject: "E-Store",
    message,
    htmlModified,
  })
    .then((data) => {})
    .catch((error) => {
      console.log(error);
      isUser.emailverifyOTP = undefined;
      isUser.emailVerifyOTPExpire = undefined;
      isUser.save({ validateBeforeSave: false });
      res.status(400).json({ success: false, message: error.message });
    });

  res.status(200).json({
    success: true,
    message: "Otp has been resent successfully!",
    user: isUser,
  });
});

exports.verifyEmailVerificationOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  if (!req.body.OTP) {
    return next(new ErrorHandler(400, "Please enter email verification OTP"));
  }

  const isUser = await userModel.findById(req.body._id);
  if (!isUser) {
    return next(new ErrorHandler(400, "User not Found"));
  }
  if (isUser.isEmailVerified) {
    return next(new ErrorHandler(400, "Your email is already verified"));
  }

  const emailverifyOTP = crypto
    .createHash("sha256")
    .update(req.body.OTP)
    .digest("hex");

  const user = await userModel.findOne({
    emailverifyOTP,
    _id: req.body._id,
    emailVerifyOTPExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler(400, "Your OTP was expired"));
  }

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  // Generate Phone Verification OTP
  const phoneVerifyOTP = user.getPhoneVerificationOTP();
  await user.save({ validateBeforeSave: false });

  const smsMessage = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;

  try {
    await sendSMS(user.number, smsMessage);

    res.status(200).json({
      success: true,
      message: "Email verified. Please verify your phone number.",
      requiresPhoneVerification: true,
      user: {
        _id: user._id,
        number: user.number,
      },
    });
  } catch (error) {
    user.phoneVerifyOTP = undefined;
    user.phoneVerifyOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new ErrorHandler(500, "Error sending SMS. Please try again later.")
    );
  }
});

exports.verifyResetPasswordOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  if (!req.body.OTP) {
    return next(
      new ErrorHandler(400, "Please enter forgot password recovery OTP")
    );
  }
  const resetPasswordOTP = crypto
    .createHash("sha256")
    .update(req.body.OTP)
    .digest("hex");
  const user = await userModel.findOne({
    resetPasswordOTP,
    _id: req.body._id,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ErrorHandler(400, "Your OTP was expired"));
  }
  res.status(200).json({ success: true, message: "OTP verified", user: user });
});

exports.resetPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.password) {
    return next(new ErrorHandler(400, "Please enter your password"));
  }
  if (!req.body.confirmPassword) {
    return next(new ErrorHandler(400, "Please enter confirm password"));
  }
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Please  email"));
  }
  const email = req.body.email.toLowerCase();

  const user = await userModel.findOne({ email: email });
  console.log(user);
  if (!user) {
    return next(new ErrorHandler(400, "User not found"));
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler(400, "password and confirm password not matched")
    );
  }
  user.resetPasswordExpire = undefined;
  user.resetPasswordOTP = undefined;
  user.password = req.body.password;

  const obj = await user.save({ validateBeforeSave: false });
  if (!obj) {
    return next(new ErrorHandler(400, "Password not updated"));
  }
  res.status(200).json({ success: true, message: "Password updated", user });
});

exports.getuserOwnProfile = asyncErrorCatch(async (req, res, next) => {
  // debugger;
  console.log("me ==> ", req);
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  const user = await userModel.findById(req.body._id);
  if (!user) {
    return new new ErrorHandler(401, "user not found")();
  }
  return res
    .status(200)
    .json({ success: true, user, message: "User detail fetched successfully" });
});

exports.updateuserOwnPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  if (!req.body.newPassword) {
    return next(new ErrorHandler(400, "Please enter your new Password"));
  }
  if (!req.body.oldPassword) {
    return next(new ErrorHandler(400, "Please enter your old password"));
  }
  const { oldPassword, newPassword } = req.body;
  const user = await userModel.findById(req.body._id).select("+password");
  const isPasswordMatched = await user.comparePassword(oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler(401, "old password does not match"));
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json({ success: true, message: "password updated" });
});
function formatFilePath(filePath) {
  if (filePath) {
    return filePath.replace(/\\/g, "/");
  } else {
    return;
  }
}
exports.updateuserOwnProfile = asyncErrorCatch(async (req, res, next) => {
  // if (!req.body.name) {
  //     return next(new ErrorHandler(400, "Please enter your name"))
  // }
  // if (!req.body.email) {
  //     return next(new ErrorHandler(400, "Please enter your email"))
  // }
  // if (!req.body.number) {
  //     return next(new ErrorHandler(400, "Please enter your mobile number"))
  // }
  // if (!req.body.address) {
  //     return next(new ErrorHandler(400, "Please enter your address"))
  // }
  // if (!req.file.path) {
  //     return next(new ErrorHandler(400, "Please select your profile picture"))
  // }
  const user = await userModel.findById(req.body._id);
  if (!user) {
    return next(new ErrorHandler(404, "user not found"));
  }
  const Data = {
    name: req.body.name,
    email: req.body.email.toLowerCase(),

    address: req.body.address,
    number: req.body.number,
    profile: req?.file?.path,
    // profile: `${req?.file?.destination}/${req?.file?.originalname}`
  };
  // Data.profile = Data.profile.replace('./', '');
  const newData = await isObjectPropertyEmpty(Data, user);
  userModel.findByIdAndUpdate(
    req.body._id,
    newData,
    { runValidators: true },
    async (err, result) => {
      if (err) {
        fs.unlinkSync(req?.file?.path);
        return next(new ErrorHandler(400, "user profile not updated"));
      } else {
        if (req?.file?.path) {
          fs.unlinkSync(result?.profile);
        }
        const user = await userModel.findById(req.body._id);
        let profile = formatFilePath(user?.profile);
        // user?.p
        user.profile = profile;
        res
          .status(200)
          .json({ success: true, message: "user profile updated", user });
      }
    }
  );
});
// super admin
exports.getAllusersByAdmin = asyncErrorCatch(async (req, res, next) => {
  const users = await userModel
    .find()
    .select("+isEmailVerified")
    .select("+isDocumentVerified");
  if (!users) {
    return next(new ErrorHandler(400, "No user Found"));
  }
  res.status(200).json({ success: true, users });
});

exports.getAllusersByAdminWhoAreNotVerified = asyncErrorCatch(
  async (req, res, next) => {
    const startDate = req?.query?.startDate;
    const endDate = req?.query?.endDate;

    const query = { isDocumentVerified: false, isEmailVerified: true };

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const users = await userModel
      .find(query)
      .sort({ createdAt: -1 })
      .select("+isEmailVerified")
      .select("+isDocumentVerified");
    if (users?.length === 0) {
      return next(new ErrorHandler(400, "No user Found"));
    }
    const filterUsers = users.filter((user) => {
      console.log(user.document);
      return user.document !== "";
    });

    res.status(200).json({ success: true, users: filterUsers });
  }
);
exports.getAllusersByAdminWhoAreVerified = asyncErrorCatch(
  async (req, res, next) => {
    const startDate = req?.query?.startDate;
    const endDate = req?.query?.endDate;

    const query = { isDocumentVerified: true, isEmailVerified: true };

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const users = await userModel
      .find(query)
      .select("+isEmailVerified")
      .sort({ createdAt: -1 })
      .select("+isDocumentVerified");
    if (!users) {
      return next(new ErrorHandler(400, "No user Found"));
    }
    res.status(200).json({ success: true, users });
  }
);

exports.updateUserStatusByAdmin = asyncErrorCatch(async (req, res, next) => {
  const user = await userModel.findById(req.params.id);
  if (!user) {
    return next(new ErrorHandler(400, "user not found"));
  }
  const formatter = new Intl.DateTimeFormat("en", { month: "long" });
  const month1 = formatter.format(new Date());
  const Data = {
    isDocumentVerified: req.body?.isDocumentVerified,
    isUserBlock:
      req.body.status === "blocked"
        ? true
        : req.body.status === "active"
        ? false
        : false,

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

  const newData = await isObjectPropertyEmpty(Data, user);
  userModel.findByIdAndUpdate(req.params.id, newData, (err, result) => {
    if (err) {
      return next(new ErrorHandler(404, "User Not Found"));
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
        email: user.email,
        subject: "Skip A Line",
        message,
        htmlModified,
      });

      return res.status(200).json({ success: true, msg: `${req.body.status}` });
    }
  });
});
exports.getSingleuserDetail = asyncErrorCatch(async (req, res, next) => {
  const user = await userModel
    .findById(req.params.id)
    .select("+isEmailVerified")
    .select("+isDocumentVerified");
  if (!user) {
    return next(new ErrorHandler(400, "No user Found"));
  }
  res.status(200).json({ success: true, user });
});

exports.getTotalNumberOfUsers = asyncErrorCatch(async (req, res, next) => {
  const totalUsers = await userModel.count();
  console.log(totalUsers);
  res.status(200).json({ success: true, totalUsers });
});

exports.getTotalNumberOfUsersNotVerified = asyncErrorCatch(
  async (req, res, next) => {
    const totalUsersNotVerified = await userModel
      .find({ isDocumentVerified: false })
      .count();
    console.log(totalUsersNotVerified);
    res.status(200).json({ success: true, totalUsersNotVerified });
  }
);

exports.getTotalNumberOfUsersVerified = asyncErrorCatch(
  async (req, res, next) => {
    const verifiedUsers = await userModel
      .find({ isDocumentVerified: true })
      .count();
    //console.log(totalUsersNotVerified);
    res.status(200).json({ success: true, verifiedUsers });
  }
);

exports.getUserStatistics = asyncErrorCatch(async (req, res, next) => {
  const statistics = await userModel.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalUsersNotVerified: {
          $sum: { $cond: [{ $eq: ["$isDocumentVerified", false] }, 1, 0] },
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ["$isDocumentVerified", true] }, 1, 0] },
        },
        blockedUsers: {
          $sum: { $cond: [{ $eq: ["$isUserBlock", true] }, 1, 0] },
        },
      },
    },
  ]);
  const { totalUsers, totalUsersNotVerified, verifiedUsers, blockedUsers } =
    statistics[0];

  res.status(200).json({
    success: true,
    totalUsers,
    totalUsersNotVerified,
    verifiedUsers,
    blockedUsers,
  });
});

exports.getTotalNumberOfUsersBlocked = asyncErrorCatch(
  async (req, res, next) => {
    const blockedUsers = await userModel.find({ isUserBlock: true }).count();

    res.status(200).json({ success: true, blockedUsers });
  }
);

exports.getStoreDocument = asyncErrorCatch(async (req, res, next) => {
  const user = await userModel.findOne({ _id: req.params.id }, { document: 1 });
  if (!user) {
    return next(new ErrorHandler(400, "No User Found"));
  }
  res.status(200).json({ success: true, user });
});
function getMonthNameFromDate(date) {
  const options = { month: "long" };
  return date.toLocaleString("en-US", options);
}
exports.getTotalNumberOfUsersBlockByMonth = asyncErrorCatch(
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

    let toatalBlockedUsers = [0, 0, 0, 0];

    const users = await userModel.find({ isUserBlock: true });

    users.map((user) => {
      const date = new Date(`${user?.blockedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalBlockedUsers[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalBlockedUsers[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalBlockedUsers[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalBlockedUsers[3] += 1;
      }
    });

    res.status(200).json({ success: true, toatalBlockedUsers, lastFourMonths });
  }
);

exports.getTotalNumberOfUsersByAdminWhoAreVerified = asyncErrorCatch(
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

    let toatalVerifiedUsers = [0, 0, 0, 0];

    const users = await userModel.find({
      isDocumentVerified: true,
      isEmailVerified: true,
    });

    users.map((user) => {
      const date = new Date(`${user?.verifiedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalVerifiedUsers[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalVerifiedUsers[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalVerifiedUsers[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalVerifiedUsers[3] += 1;
      }
    });

    res
      .status(200)
      .json({ success: true, toatalVerifiedUsers, lastFourMonths });
  }
);

// VERIFICATION

exports.verifyUser = asyncErrorCatch(async (req, res, next) => {
  return res.status(200).json({ success: true, message: "token verified" });
});

exports.getSingleUserDetailHistory = asyncErrorCatch(async (req, res, next) => {
  console.log("called");
  const user = await userModel.findById(req.params.id).lean();

  if (!user) {
    return next(new ErrorHandler(400, "No user found"));
  } else {
    const recentOrders = await orderModel
      .find({ user: req.params.id })
      .populate("store orderStatus")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log("recentOrders", recentOrders);

    user.recentOrders = recentOrders; // Assign recentOrders array to the user object
    const orders = await orderModel
      .find({ user: req.params.id })
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
      user,
      totalEarning: totalPrice.toFixed(2),
      totalOrders,
      completedOrders,
      inProgress,
      paid,
      ready,
    });
    // res
    //     .status(200)
    //     .json({ success: true, user, message: "Store detail fetched successfully" });
  }
});

// total monthly blocked and verified users starts
exports.getTotalNumberOfUsersByMonth = asyncErrorCatch(
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
    let toatalVerifiedUsers = [0, 0, 0, 0];
    const verifiedUsers = await userModel.find({
      isDocumentVerified: true,
      isEmailVerified: true,
    });
    verifiedUsers.map((user) => {
      const date = new Date(`${user?.verifiedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalVerifiedUsers[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalVerifiedUsers[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalVerifiedUsers[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalVerifiedUsers[3] += 1;
      }
    });
    let toatalBlockedUsers = [0, 0, 0, 0];
    const blockedUsers = await userModel.find({ isUserBlock: true });
    blockedUsers.map((user) => {
      const date = new Date(`${user?.blockedAt}`);
      const monthName = getMonthNameFromDate(date);
      if (lastFourMonths[0] === monthName) {
        toatalBlockedUsers[0] += 1;
      } else if (lastFourMonths[1] === monthName) {
        toatalBlockedUsers[1] += 1;
      } else if (lastFourMonths[2] === monthName) {
        toatalBlockedUsers[2] += 1;
      } else if (lastFourMonths[3] === monthName) {
        toatalBlockedUsers[3] += 1;
      }
    });

    res.status(200).json({
      success: true,
      toatalBlockedUsers,
      toatalVerifiedUsers,
      lastFourMonths,
    });
  }
);
// total monthly blocked and verified users ends

exports.sendPhoneVerificationOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.number) {
    return next(new ErrorHandler(400, "Please provide your phone number"));
  }

  const user = await userModel.findById(req.body._id);
  if (!user) {
    return next(new ErrorHandler(404, "user not found"));
  }

  const phoneVerifyOTP = user.getPhoneVerificationOTP();
  await user.save({ validateBeforeSave: false });

  const message = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;

  try {
    await sendSMS(req.body.number, message);

    res.status(200).json({
      success: true,
      message: "Verification code sent to your phone number",
      user: {
        _id: user._id,
        number: user.number,
      },
    });
  } catch (error) {
    user.phoneVerifyOTP = undefined;
    user.phoneVerifyOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

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
    return next(new ErrorHandler(400, "Please enter user Id"));
  }

  const phoneVerifyOTP = crypto
    .createHash("sha256")
    .update(req.body.OTP)
    .digest("hex");

  const user = await userModel.findOne({
    phoneVerifyOTP,
    _id: req.body._id,
    phoneVerifyOTPExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler(400, "Invalid OTP or OTP has expired"));
  }

  user.isPhoneVerified = true;
  user.phoneVerifyOTP = undefined;
  user.phoneVerifyOTPExpire = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Phone number verified successfully",
    user,
  });
});

exports.resendPhoneVerificationOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.number) {
    return next(new ErrorHandler(400, "Please provide your phone number"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please provide user ID"));
  }

  const user = await userModel.findOne({
    _id: req.body._id,
    number: req.body.number,
  });

  if (!user) {
    return next(new ErrorHandler(404, "User not found with this phone number"));
  }

  if (user.isPhoneVerified) {
    return next(new ErrorHandler(400, "Phone number is already verified"));
  }

  const phoneVerifyOTP = user.getPhoneVerificationOTP();
  await user.save({ validateBeforeSave: false });

  const message = `Your Skip A Line phone verification code is: ${phoneVerifyOTP}. Valid for 10 minutes.`;

  try {
    await sendSMS(user.number, message);

    res.status(200).json({
      success: true,
      message: "New verification code sent to your phone number",
    });
  } catch (error) {
    user.phoneVerifyOTP = undefined;
    user.phoneVerifyOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new ErrorHandler(500, "Error sending SMS. Please try again later.")
    );
  }
});

exports.verifyUserStatus = asyncErrorCatch(async (req, res, next) => {
  const user = await userModel.findById(req.user.id);

  if (!user.isEmailVerified || !user.isPhoneVerified) {
    return next(
      new ErrorHandler(403, "Please verify both your email and phone number")
    );
  }

  return res.status(200).json({
    success: true,
    message: "User verified",
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
  });
});
