const nodemailer = require("nodemailer");

const sendEmailWithTemplate = async (options) => {
  debugger;
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false, // Use TLS (STARTTLS) instead of SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: options.email,
    subject: options.subject,
    html: options.htmlModified,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendEmailWithTemplate;
