const express = require("express");
const {
  updateContactUs,
  getContactUs,
} = require("../controllers/contactUsController");
const { isAuthenticatedAdmin } = require("../middleware/auth");

const router = express.Router();

router.put("/update", isAuthenticatedAdmin, updateContactUs);
router.get("/details", getContactUs);

module.exports = router;
