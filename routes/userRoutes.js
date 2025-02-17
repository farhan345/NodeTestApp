const express = require("express");
const {
  getAllstoresByAdminWhoAreVerified,
} = require("../controllers/storeController");
const {
  userRegister,
  userLogin,
  getuserOwnProfile,
  updateuserOwnPassword,
  updateuserOwnProfile,
  getUserStatistics,
  getTotalNumberOfUsersVerified,
  forgotPassword,
  resetPassword,
  getSingleuserDetail,
  verifyEmailVerificationOTP,
  resendOTP,
  getAllusersByAdmin,
  getAllusersByAdminWhoAreNotVerified,
  registerUserDocument,
  updateUserInfoByAdmin,
  verifyResetPasswordOTP,
  updateUserStatusByAdmin,
  getTotalNumberOfUsers,
  getTotalNumberOfUsersNotVerified,
  getTotalNumberOfUsersBlocked,
  getStoreDocument,
  getAllusersByAdminWhoAreVerified,
  getTotalNumberOfUsersBlockByMonth,
  getTotalNumberOfUsersByAdminWhoAreVerified,
  verifyUser,
  getSingleUserDetailHistory,
  getTotalNumberOfUsersByMonth,
  sendPhoneVerificationOTP,
  verifyPhoneOTP,
  resendPhoneVerificationOTP,
  verifyUserStatus,
} = require("../controllers/userController");
const router = express.Router();
const {
  isAuthenticatedAdmin,
  authorizedRoles,
  isAuthenticatedUser,
  authorizedStatus,
  isAuthenticatedToken,
} = require("../middleware/auth");
// const { generateThumbnailMiddleware } = require('../middleware/generateThumbnail')
const userModel = require("../models/user");
const {
  uploadUserProfileImage,
  uploadUserDocumentImage,
} = require("../utils/uploadFile");

router.post("/register", uploadUserProfileImage.single("image"), userRegister); //1
router.post("/verify/email", verifyEmailVerificationOTP); //1
router.post("/resend/otp", resendOTP); //1
router.post("/login", userLogin); //1

router.post("/get/again/token", verifyEmailVerificationOTP);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset", resetPassword);
router.post("/password/verify/otp", verifyResetPasswordOTP); //1
router.post("/send-phone-otp", sendPhoneVerificationOTP);
router.post("/verify-phone-otp", verifyPhoneOTP);
router.post("/resend-phone-otp", resendPhoneVerificationOTP);
router.get("/verify-status", verifyUserStatus);

router.put(
  "/register/document",
  isAuthenticatedUser,
  uploadUserDocumentImage.single("image"),
  registerUserDocument
);
router.post("/me", isAuthenticatedUser, getuserOwnProfile); //1
router.put("/me/update/password", isAuthenticatedUser, updateuserOwnPassword); //1
router.put(
  "/me/update",
  isAuthenticatedUser,
  uploadUserProfileImage.single("image"),
  updateuserOwnProfile
); //1

//admin routes

router.get(
  "/admin/users",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getAllusersByAdmin
);
router.get(
  "/admin/user/document/:id",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getStoreDocument
);

router.get(
  "/admin/users/noverified",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getAllusersByAdminWhoAreNotVerified
);
router.get(
  "/admin/users/verified",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getAllusersByAdminWhoAreVerified
);

router.get(
  "/admin/user/:id",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getSingleuserDetail
);
router.put(
  "/admin/user/:id",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  updateUserStatusByAdmin
);

router.get(
  "/total",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getTotalNumberOfUsers
);
router.get(
  "/total/noverified",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getTotalNumberOfUsersNotVerified
);
router.get(
  "/total/verified",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getTotalNumberOfUsersVerified
);
router.get(
  "/total/block",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getTotalNumberOfUsersBlocked
);
router.get(
  "/total/getUserStatistics",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getUserStatistics
);

// replaced Starts
router.get(
  "/total/block/month",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getTotalNumberOfUsersBlockByMonth
);
router.get(
  "/total/verify/month",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getTotalNumberOfUsersByAdminWhoAreVerified
);
// replaced Ends

// to be
router.get(
  "/total/monthlyUsers",
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  getTotalNumberOfUsersByMonth
);

router.get("/:id", isAuthenticatedAdmin, getSingleUserDetailHistory);

// Verify

router.get("/verify", isAuthenticatedToken, verifyUser);
module.exports = router;
