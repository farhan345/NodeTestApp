const axios = require("axios");

const sendSMS = async (phoneNumber, message) => {
  debugger;
  try {
    // Construct the payload as key-value pairs
    const payload = new URLSearchParams();
    payload.append("AccountId", "CI00220285");
    payload.append("Email", "skipaline.corp@gmail.com");
    payload.append("Password", "hSous5$6");
    payload.append("Recipient", phoneNumber); // Ensure the key is correct (Recipient or Recipient)
    payload.append("Message", message);

    console.log("Payload:", payload.toString());

    // URL with Action=SendSMS as a query parameter
    const url = "http://www.redoxygen.net/sms.dll?Action=SendSMS";

    const response = await axios.post(
      url,
      payload.toString(), // Send the URL-encoded string
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Red Oxygen Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send SMS:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("Request data:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};
module.exports = sendSMS;
