const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const errorHandleMiddleware = require("./middleware/errorHandleMiddleware");
const app = express();
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const storeRoutes = require("./routes/storeRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/productCategoryRoutes");
const offerCategoryRoutes = require("./routes/offerCategoryRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const offerRoutes = require("./routes/offerRoutes");
const odderRoutes = require("./routes/orderRoutes");
const orderStatusRoutes = require("./routes/orderStatusRoutes");
const storeCategoryRoutes = require("./routes/storeCategoryRoutes");
const favouriteRoutes = require("./routes/favouriteRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const cartRoutes = require("./routes/cartRoutes");
const faqRoutes = require("./routes/faqRoutes");
const aboutUsRoutes = require("./routes/aboutUsRoutes");
const termsConditionRoutes = require("./routes/termsConditionRoutes");
const privacyPolicyRoutes = require("./routes/privacyPolicyRoutes");
const taxRoutes = require("./routes/taxManagementRoutes");
const serviceRoutes = require("./routes/serviceManagementRoutes");
const contactUsRoutes = require("./routes/contactUsRoutes");
const { startSchedulers } = require("./controllers/scheduler.js");
app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:3000",
      "https://www.skipaline.com",
      "https://skipaline.com",
    ],
  })
);

app.use(
  "/resources/images/store/document",
  express.static("resources/images/store/document")
);
app.use(
  "/resources/images/store/profile",
  express.static("resources/images/store/profile")
);
app.use(
  "/resources/images/store/cover",
  express.static("resources/images/store/cover")
);

app.use(
  "/resources/images/user/document",
  express.static("resources/images/user/document")
);
app.use(
  "/resources/images/user/profile",
  express.static("resources/images/user/profile")
);

app.use(
  "/resources/images/product",
  express.static("resources/images/product")
);

app.use("/resources/excelfiles", express.static("resources/excelfiles"));

app.use(
  "/resources/template/images",
  express.static("resources/template/images")
);

// json body parser middleware
app.use(express.json());

//cookie parser
app.use(cookieParser());

//url encoded parser
app.use(express.urlencoded({ extended: true }));

//routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/store", storeRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/product/category", categoryRoutes);
app.use("/api/v1/offer/category", offerCategoryRoutes);
app.use("/api/v1/employee", employeeRoutes);
app.use("/api/v1/offer", offerRoutes);
app.use("/api/v1/order", odderRoutes);
app.use("/api/v1/order/status", orderStatusRoutes);
app.use("/api/v1/store/category", storeCategoryRoutes);
app.use("/api/v1/user/favourite", favouriteRoutes);
app.use("/api/v1/config/paypal", paymentRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/faq", faqRoutes);
app.use("/api/v1/aboutus", aboutUsRoutes);
app.use("/api/v1/termscondition", termsConditionRoutes);
app.use("/api/v1/privacypolicy", privacyPolicyRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/tax", taxRoutes);
app.use("/api/v1/service", serviceRoutes);
app.use("/api/v1/contactus", contactUsRoutes);

// custom error handling middleware
app.use(errorHandleMiddleware);
startSchedulers();

module.exports = app;
