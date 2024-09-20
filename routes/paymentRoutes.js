const express = require("express");
const {
  newOrder,
  getAllUserOrdersByStoreOwner,
  getSingleOrderDetailByStoreOwner,
  getUSerOwnOrders,
  updateUserOrderStatus,
  getSingleOrderDetailByUser,
} = require("../controllers/odderController");
const paymentController = require("../controllers/paymentController");
const router = express.Router();
const {
  isAuthenticatedUser,
  isAuthenticatedStore,
} = require("../middleware/auth");

// User Routes
router.post("/create-checkout", paymentController.createCheckoutSession);
router.post(
  "/create-pending-checkout",
  paymentController.creatependingCheckoutSession
);
router.get("/payment-success", paymentController.paymentSuccess);
router.get("/payment-success", paymentController.paymentFailed);
router.get(
  "/connect-stripe-account/:id",
  paymentController.connectStripeAccount
);
router.get("/connect/callback", paymentController.handleStripeCallback);

module.exports = router;
