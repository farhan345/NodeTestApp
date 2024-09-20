const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: [true, "Please enter product category"],
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: "storeModel",
    required: [true, "Please enter store ID"],
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

// Add compound unique index on categoryName and store
productCategorySchema.index({ categoryName: 1, store: 1 }, { unique: true });

const productCategoryModel = mongoose.model(
  "productCategoryModel",
  productCategorySchema
);

module.exports = productCategoryModel;
