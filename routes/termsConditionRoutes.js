const express = require("express");
const { isAuthenticatedAdmin } = require("../middleware/auth");
const {
  registertermsCondition,
  updatetermsConditionStore,
  updatetermsConditionUser,
  getSingletermsConditionStoreDetail,
  getSingletermsConditionUserDetail,
} = require("../controllers/termsConditionController");

const router = express.Router();

router.post("/register", isAuthenticatedAdmin, registertermsCondition);

router.post("/update/store", isAuthenticatedAdmin, updatetermsConditionStore);
router.post("/update/user", isAuthenticatedAdmin, updatetermsConditionUser);

router.get("/store", getSingletermsConditionStoreDetail);
router.get("/user", getSingletermsConditionUserDetail);

module.exports = router;
