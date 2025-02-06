const mongoose = require("mongoose");

const ContactUsSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactUs", ContactUsSchema);
