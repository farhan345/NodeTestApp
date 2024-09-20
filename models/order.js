const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderItems: [
    {
      productName: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      discountedPrice: {
        type: Number,
        default: 0,
      },
      product: {
        type: mongoose.Schema.ObjectId,
        ref: "productModel",
        required: true,
      },
    },
  ],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "userModel",
    required: true,
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: "storeModel",
    required: true,
  },
  orderType: {
    type: String,
    required: true,
  },
  paymentInfo: {
    transactionId: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
    method: {
      type: String,
      default: "stripe",
    },
  },
  isOnlineOrder: {
    type: Boolean,
    required: [
      true,
      "please specify that order is come from online or offline",
    ],
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  platformFee: {
    type: Number,
    required: true,
    default: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  tax: {
    type: Number,
    required: true,
    default: 0,
  },
  orderStatus: {
    type: mongoose.Schema.ObjectId,
    ref: "orderStatusModel",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// orderSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'orderItems.product',
//     select: '-isDeleted',
//   });
//   this.populate({
//     path: 'store',
//     select: '-isDeleted',
//   });
//   this.populate({
//     path: 'user',
//     select: '-isDeleted',
//   });
//   next();
// });

// orderSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'orderItems.product',
//     select: '-isDeleted',
//     match: { isDeleted: false },
//   });

//   next();
// });

// orderSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'store',
//     select: '-isDeleted',
//     match: { isDeleted: false },
//   });

//   next();
// });
// orderSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'user',
//     select: '-isDeleted',
//     match: { isDeleted: false },
//   });

//   next();
// });
const orderModel = mongoose.model("OrderModel", orderSchema);
module.exports = orderModel;
