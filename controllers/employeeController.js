const employeeModel = require("../models/employee");
const storeModel = require("../models/store");
const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const fs = require("fs");
const sendToken = require("../utils/getJwtToken");
const sendEmailToemployee = require("../utils/sendMail");
const asyncErrorHandlers = require("../middleware/asyncErrorHandlers");
const crypto = require("crypto");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const { log } = require("console");
const { ObjectId } = require("mongodb");

exports.employeeRegister = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.name) {
    return next(new ErrorHandler(400, "Please enter employee name"));
  }
  if (!req.body.type) {
    return next(new ErrorHandler(400, "Please select employee type"));
  }
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please provide store Id"));
  }
  const store = await storeModel.findOne(
    { _id: req.body.store, isStoreBlock: false },
    { name: 1 }
  );
  if (!store) {
    return next(new ErrorHandler(404, "Store Not Found"));
  }
  console.log(req.body);
  const storeName = store?.name;
  const formattedStoreName = storeName.replace(/\s+/g, ""); // replace white spaces with dash
  const employeeName = req.body.name;
  const formattedemployeeName = employeeName.replace(/\s+/g, "-"); // replace white spaces with dash
  // const email = `${formattedemployeeName}-${Math.floor(Math.random() * 10000)}@${formattedStoreName}.com`;
  const formattedDomainName = formattedStoreName.replace(/[^\w.-]/g, "");
  const email = `${formattedemployeeName}-${Math.floor(
    Math.random() * 10000
  )}@${formattedDomainName}.com`;
  //const email = `${formattedemployeeName}-${Math.floor(Math.random() * 10000)}@${formattedStoreName}.com`;
  // const sanitizedEmail = email.replace(/[^a-zA-Z0-9@.-]/g, '_');

  const Data = {
    name: req.body.name,
    password: "12345678",
    email: email.toLowerCase(),
    type: req.body.type,
    store: req.body.store,
  };
  console.log(Data);
  // if(req.body.emailForForgotPassword){
  //     const oldemployee = await employeeModel.findOne({ emailForForgotPassword: req.body.emailForForgotPassword });
  // if (oldemployee) {
  //     return next(new ErrorHandler(400, "Email already registered"))
  // }
  // }
  // const oldemployee = await employeeModel.findOne({ email: req.body.email });
  // if (oldemployee) {
  //     return next(new ErrorHandler(400, "Employee Already Registered On This Email"))
  // }
  employeeModel.create(Data, async (err, result) => {
    if (err) {
      console.log(err);
      return next(new ErrorHandler(400, err.message));
    } else {
      res.status(200).json({
        success: true,
        message: "Employee registered successfully",
        result,
      });
    }
  });
});

exports.addForgotPasswordEmail = asyncErrorCatch(async (req, res, next) => {
  const msg =
    "OTP is send on your email, please verify your email before login";
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter employee Id"));
  }
  if (!req.body.emailForForgotPassword) {
    return next(new ErrorHandler(400, "Please enter forgot Password email"));
  }
  const forgotEmail = req.body.emailForForgotPassword.toLowerCase();
  const existingEmail = await employeeModel.find({
    emailForForgotPassword: forgotEmail,
    _id: { $ne: new ObjectId(req.body._id) },
  });
  if (existingEmail?.length !== 0) {
    return next(new ErrorHandler(400, "Email already registerd"));
  }

  const employee = await employeeModel.findById(req.body._id);
  if (!employee) {
    return next(new ErrorHandler(404, "Employee Not Found"));
  }
  const token = "";
  employee.emailForForgotPassword = forgotEmail;
  employee.save({ validateBeforeSave: false }, async (err, result) => {
    if (err) {
      return next(new ErrorHandler(400, err.message));
    } else {
      console.log(result);
      sendOTPForEmailVerification(employee, res, msg, token);
    }
  });
});
const sendOTPForEmailVerification = async (
  { _id, emailForForgotPassword },
  res,
  msg,
  token
) => {
  let employee;
  try {
    employee = await employeeModel.findById(_id);
    if (!employee) {
      res.status(400).json({ success: false, message: "employee not found" });
    }
    const emailVerifyOTP = employee.getEmailVerificationOPT();
    await employee.save({ validateBeforeSave: false });
    const message = `your email verification OTP is :- \n\n${emailVerifyOTP}\n\n
            if you have not requested this email then please ignore it`;
    sendEmailToemployee({
      email: employee.emailForForgotPassword,
      subject: "E-Store",
      message,
    })
      .then((data) => {
        res.status(200).json({ success: true, token, message: msg, employee });
      })
      .catch((error) => {
        res.status(400).json({ success: false, message: `${error?.message}` });
      });
  } catch (error) {
    employee.emailverifyOTP = undefined;
    employee.emailVerifyOTPExpire = undefined;
    await employee.save({ validateBeforeSave: false });
    res
      .status(400)
      .json({ success: false, message: error.message, stack: error.stack });
  }
};
exports.employeeLogin = asyncErrorCatch(async (req, res, next) => {
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
  const employee = await employeeModel
    .findOne({ email: email })
    .select("+password");
  if (!employee) {
    return next(new ErrorHandler(401, "Invalid Email or Password"));
  }
  if (employee.status === "inactive") {
    return next(
      new ErrorHandler(
        401,
        "You are not an active employee, please update your status"
      )
    );
  }
  const isPasswordMatched = await employee.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler(401, "Invalid Email or Password"));
  }
  if (employee?.emailForForgotPassword === "") {
    res.status(400).json({
      success: false,
      token: "",
      employee,
      message: "Forgot Password Email Not Found",
    });
  }
  if (!employee?.isEmailForgotPasswordVerified) {
    res.status(400).json({
      success: false,
      token: "",
      employee,
      message: "Forgot password email not verified please register it again",
    });
  }
  const token = await employee.getJWTToken();
  res
    .status(200)
    .json({ success: true, token, employee, message: "Login Successfully" });
});

exports.forgotPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.emailForForgotPassword) {
    return next(new ErrorHandler(400, "Please enter your email"));
  }
  const employee = await employeeModel.findOne({
    emailForForgotPassword: req.body.emailForForgotPassword,
  });
  if (!employee) {
    return next(
      new ErrorHandler(
        400,
        "You are not able to forgot your password, please contact from store."
      )
    );
  }
  if (employee.status === "inactive") {
    return next(
      new ErrorHandler(
        401,
        "you are not an active employee, please update your status"
      )
    );
  }
  const resetOTP = await employee.getResetPasswordOPT();

  await employee.save({ validateBeforeSave: false });
  const resetPasswordOTP = `${resetOTP}`;
  const message = `your reset password OTP is :- \n\n${resetPasswordOTP}\n\n
    if you have not requested this email then please ignore it`;

  try {
    sendEmailToemployee({
      email: employee.emailForForgotPassword,
      subject: "E-Store",
      message,
    })
      .then((data) => {
        res.status(200).json({
          success: true,
          message: "OTP for password recovery is send on your email",
          employee,
        });
      })
      .catch((error) => {
        res
          .status(400)
          .json({ success: false, message: "please click on resend it again" });
      });
  } catch (error) {
    employee.resetPasswordOTP = undefined;
    employee.resetPasswordExpire = undefined;
    await employee.save({ validateBeforeSave: false });
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.verifyResetPasswordOTP = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.OTP) {
    return next(new ErrorHandler(400, "Please enter Forgot Password OTP"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter employee Id"));
  }

  const resetPasswordOTP = crypto
    .createHash("sha256")
    .update(req.body.OTP)
    .digest("hex");
  const employee = await employeeModel.findOne({
    resetPasswordOTP,
    _id: req.body._id,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!employee) {
    return next(new ErrorHandler(400, "Your OTP was expired"));
  }
  res
    .status(200)
    .json({ success: true, message: "OTP verified", employee: employee });
});

exports.verifyEmployeeEmailVerificationOTP = asyncErrorCatch(
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
    const employee = await employeeModel.findOne({
      emailverifyOTP,
      _id: req.body._id,
      emailVerifyOTPExpire: { $gt: Date.now() },
    });
    if (!employee) {
      return next(new ErrorHandler(400, "Your OTP was expired"));
    }
    employee.isEmailForgotPasswordVerified = true;
    const obj = await employee.save({ validateBeforeSave: false });
    if (!obj) {
      return next(new ErrorHandler(400, "Email Not Verified"));
    }
    res
      .status(200)
      .json({ success: true, message: "Email verified", employee: employee });
  }
);

exports.resetPassword = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.email) {
    return next(new ErrorHandler(400, "Please enter your email"));
  }
  if (!req.body.password) {
    return next(new ErrorHandler(400, "Please enter your password"));
  }
  if (!req.body.confirmPassword) {
    return next(new ErrorHandler(400, "Please enter confirm Password"));
  }
  const employee = await employeeModel.findOne({ email: req.body.email });
  console.log(employee);
  if (!employee) {
    return next(new ErrorHandler(400, "Employee not found"));
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler(400, "Password and confirm password not matched")
    );
  }
  employee.resetPasswordExpire = undefined;
  employee.resetPasswordOTP = undefined;
  employee.password = req.body.password;

  const obj = await employee.save({ validateBeforeSave: false });
  if (!obj) {
    return next(new ErrorHandler(400, "Password not updated"));
  }
  res
    .status(200)
    .json({ success: true, message: "Password updated", employee });
});

exports.updateEmployeeOwnPassword = asyncErrorCatch(async (req, res, next) => {
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
  const employee = await employeeModel
    .findById(req.body._id)
    .select("+password");
  const isPasswordMatched = await employee.comparePassword(oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler(401, "old password does not match"));
  }
  employee.password = newPassword;
  await employee.save({ validateBeforeSave: false });
  return res.status(200).json({ success: true, message: "password updated" });
});

exports.getEmployeeOwnProfile = asyncErrorCatch(async (req, res, next) => {
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter employee Id"));
  }
  const employee = await employeeModel.findById(req.body._id);
  if (!employee) {
    return new new ErrorHandler(401, "Employee not found")();
  }
  return res.status(200).json({
    success: true,
    employee,
    message: "Employee detail fetched successfully",
  });
});
// store owners
exports.getAllEmployeesByStoreOwner = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please provide store Id"));
    }
    const employees = await employeeModel
      .find({ store: req.body.store, isDeleted: false })
      .sort({ createdAt: -1 });
    if (!employees) {
      return next(new ErrorHandler(404, "No employee Found"));
    }
    res.status(200).json({
      success: true,
      employees,
      message: "All employees fetched successfully",
    });
  }
);

exports.updateEmployeeInfoByStoreOwner = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.name) {
      return next(new ErrorHandler(400, "Please enter employee name"));
    }
    if (!req.body.password) {
      return next(new ErrorHandler(400, "Please enter employee password"));
    }
    if (!req.body.email) {
      return next(new ErrorHandler(400, "Please enter employee email"));
    }
    if (!req.body.type) {
      return next(new ErrorHandler(400, "Please select employee type"));
    }
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please provide store Id"));
    }
    if (!req.body._id) {
      return next(new ErrorHandler(400, "Please enter employee Id"));
    }
    const employee = await employeeModel.findOne({
      _id: req.body._id,
      store: req.body.store,
      isDeleted: false,
    });
    if (!employee) {
      return next(new ErrorHandler(400, "Employee not found"));
    }
    const Data = {
      name: req.body.name,
      password: req.body.password,
      email: req.body.email,
      type: req.body.type,
      emailForForgotPassword: req.body.emailForForgotPassword,
      status: req.body.status,
    };
    const newData = await isObjectPropertyEmpty(Data, employee);
    employeeModel.findByIdAndUpdate(req.body._id, newData, (err, result) => {
      if (err) {
        return next(new ErrorHandler(400, "Employee Not Found"));
      } else {
        return res.status(200).json({
          success: true,
          msg: "Employee details updated",
          employee: result,
        });
      }
    });
  }
);

exports.getSingleEmployeeDetail = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please provide store Id"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please provide email Id"));
  }
  const employee = await employeeModel.findOne({
    _id: req.body._id,
    store: req.body.store,
    isDeleted: false,
  });
  console.log(employee);
  if (!employee) {
    return next(new ErrorHandler(400, "No employee Found"));
  }
  res.status(200).json({
    success: true,
    employee,
    message: "Employee detail fetched successfully",
  });
});

exports.deleteEmployee = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body?._id) {
    return next(new ErrorHandler(400, "Please entere employee Id"));
  }

  employeeModel.findByIdAndUpdate(
    { _id: req.body._id },
    { $set: { isDeleted: true } },
    (err, result) => {
      if (err) {
        return next(new ErrorHandler(400, err.message));
      }
      if (!result) {
        return next(new ErrorHandler(404, "employee not found"));
      } else {
        res.status(200).json({ success: true, message: "employee deleted" });
      }
    }
  );
});
