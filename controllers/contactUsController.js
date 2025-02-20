const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ContactUs = require("../models/contactus");

exports.getContactUs = asyncErrorCatch(async (req, res, next) => {
  try {
    const contact = await ContactUs.findOne();
    if (!contact)
      return res.status(404).json({ message: "No contact info found" });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

exports.updateContactUs = asyncErrorCatch(async (req, res, next) => {
  try {
    const { email, phone, address, socialLinks } = req.body;
    let contact = await ContactUs.findOne();

    if (!contact) {
      contact = new ContactUs({ email, phone, address, socialLinks });
    } else {
      contact.email = email;
      contact.phone = phone;
      contact.address = address;
      contact.socialLinks = socialLinks;
    }

    await contact.save();
    res.json({ message: "Contact info updated successfully", contact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
