const mongoose = require("mongoose");

const serviceManagementSchema = new mongoose.Schema({
  storesData: [
    {
      storeId: {
        type: String,
        required: [true, "please enter store id"],
      },
      serviceCharges: {
        type: Number,
        required: [true, "please enter service charges"],
      },
    }
  ],
  defaultServiceCharges: {
    type: Number,
    required: [true, "please enter default service charges"],
  },
});

const serviceManagementModel = mongoose.model(
  "serviceChargesModel",
  serviceManagementSchema
);
module.exports = serviceManagementModel;
