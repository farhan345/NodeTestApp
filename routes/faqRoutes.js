const express = require("express");
const {
  registerFaqs,
  getSingleFaqsDetail,
  deletefaqs,
  updatefaqs,
  getAllStoreFaqs,
  getAllUserFaqs,
} = require("../controllers/faqController");
const {
  isAuthenticatedAdmin,
  isAuthenticatedUser,
} = require("../middleware/auth");

const router = express.Router();

router.post("/register", isAuthenticatedAdmin, registerFaqs);
router.get("/store", getAllStoreFaqs);
router.get("/user", getAllUserFaqs);

router.put("/:id", isAuthenticatedAdmin, updatefaqs);
router.get("/:id", isAuthenticatedAdmin, getSingleFaqsDetail);
router.delete("/:id", isAuthenticatedAdmin, deletefaqs);
module.exports = router;
