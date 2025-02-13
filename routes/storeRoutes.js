const express = require("express");
const {
  storeRegister,
  verifyStoreEmailVerificationOTP,
  storeLogin,
  forgotPassword,
  resetPassword,
  verifyResetPasswordOTP,
  getstoreOwnProfile,
  updatestoreOwnPassword,
  getAllstoresByAdmin,
  getAllstoresByAdminWhoAreNotVerified,
  updatestoreStatusByAdmin,
  getSinglestoreDetail,
  updatestoreOwnProfile,
  updateStoreOwnProfile,
  createReview,
  getStoreReviews,
  getAllstores,
  getTotalNumberOfStores,
  getStoreStatistics,
  getTotalNumberOfStoresNotVerified,
  getTotalNumberofVerifiedStores,
  getTotalNumberOfStoresBlock,
  getStoreId,
  getStoreDocument,
  getAllstoresByAdminWhoAreVerified,
  getTotalNumberOfStoresBlockByMonth,
  getTotalNumberOfstoresByAdminWhoAreVerified,
  getAllNearestStores,
  getSinglestoreDetailByUser,
  verifyStore,
  getTotalNumberOfStoresByMonth,
  resendEmailVerificationOTP,
  getStoreFees,
  sendPhoneVerificationOTP,
  verifyPhoneOTP,
  resendPhoneVerificationOTP,
} = require("../controllers/storeController");
const router = express.Router();
const {
  isAuthenticatedAdmin,
  authorizedRoles,
  authorizedStatus,
  isAuthenticatedStore,
  isAuthenticatedUser,
  isAuthenticatedToken,
} = require("../middleware/auth");
const { uploadStoreFiles } = require("../utils/uploadFile");

router.post(
  "/register",
  uploadStoreFiles.fields([
    {
      name: "storeProfile",
      maxCount: 1,
    },
    {
      name: "storeDocument",
      maxCount: 1,
    },
    {
      name: "storeCover",
      maxCount: 1,
    },
  ]),
  storeRegister
); //1

router.post("/verify/email", verifyStoreEmailVerificationOTP); //1
router.post("/login", storeLogin); //1

router.post("/resend/otp", resendEmailVerificationOTP);
router.post("/get/again/token", verifyStoreEmailVerificationOTP);

router.post("/password/forgot", forgotPassword);
router.post("/password/verify/otp", verifyResetPasswordOTP); //1
router.put("/password/reset", resetPassword);

router.post("/send-phone-otp", sendPhoneVerificationOTP);
router.post("/verify-phone-otp", verifyPhoneOTP);
router.post("/resend-phone-otp", resendPhoneVerificationOTP);

router.post("/me", isAuthenticatedStore, getstoreOwnProfile); //1
router.put("/me/update/password", isAuthenticatedStore, updatestoreOwnPassword); //1
router.post(
  "/me/update",
  isAuthenticatedStore,
  uploadStoreFiles.fields([
    {
      name: "storeProfile",
      maxCount: 1,
    },
    {
      name: "storeDocument",
      maxCount: 1,
    },
    {
      name: "storeCover",
      maxCount: 1,
    },
  ]),
  updateStoreOwnProfile
); //1
router.post("/all", isAuthenticatedUser, getAllstores);
router.post("/all/nearest", isAuthenticatedUser, getAllNearestStores);
router.post("/single", isAuthenticatedUser, getSinglestoreDetailByUser);

//Reviews

router.post("/add/review", isAuthenticatedUser, createReview);
router.post("/reviews", isAuthenticatedUser, getStoreReviews);

//admin routes

router.get("/admin/stores", isAuthenticatedAdmin, getAllstoresByAdmin);
router.get("/admin/store/document/:id", isAuthenticatedAdmin, getStoreDocument);
router.get(
  "/admin/stores/noverified",
  isAuthenticatedAdmin,
  getAllstoresByAdminWhoAreNotVerified
);
router.get(
  "/admin/stores/verified",
  isAuthenticatedAdmin,
  getAllstoresByAdminWhoAreVerified
);

router.get("/admin/store/:id", isAuthenticatedAdmin, getSinglestoreDetail);
router.put("/admin/store/:id", isAuthenticatedAdmin, updatestoreStatusByAdmin);
router.get("/total", isAuthenticatedAdmin, getTotalNumberOfStores);
router.get(
  "/total/noverified",
  isAuthenticatedAdmin,
  getTotalNumberOfStoresNotVerified
);
router.get(
  "/total/verifiedStores",
  isAuthenticatedAdmin,
  getTotalNumberofVerifiedStores
);
router.get("/total/block", isAuthenticatedAdmin, getTotalNumberOfStoresBlock);
router.get(
  "/total/getStoreStatistics",
  isAuthenticatedAdmin,
  getStoreStatistics
);
// replaced starts
router.get(
  "/total/block/month",
  isAuthenticatedAdmin,
  getTotalNumberOfStoresBlockByMonth
);
router.get(
  "/total/verify/month",
  isAuthenticatedAdmin,
  getTotalNumberOfstoresByAdminWhoAreVerified
);
// replaced ends

router.get(
  "/total/monthlyStores",
  isAuthenticatedAdmin,
  getTotalNumberOfStoresByMonth
);

//verify
router.get("/verify", isAuthenticatedStore, verifyStore);

// store fee
router.get("/fees/:storeId", getStoreFees);

module.exports = router;
