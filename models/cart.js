const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  orderItems: [
    {
      quantity: {
        type: Number,
        required: true,
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
  // offerCategory: {
  //   type: String,
  //   required: true
  // },
  status:{
    type:String,
    default:"active"
  },
  createdAt: {
    type: Date,
    required: true
  }
});


const cartModel = mongoose.model("cartModel", cartSchema);
module.exports = cartModel
