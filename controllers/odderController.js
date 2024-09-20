const orderModel = require("../models/order");
const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const productModel = require("../models/product");
const qr = require("qrcode");
const moment = require("moment");
const cartModel = require("../models/cart");
const storeModel = require("../models/store");
const offerModel = require("../models/offer");
const fs = require("fs");
const handlebars = require("handlebars");
const sendEmailWithTemplate = require("../utils/sendEmailWithTemplate");
const { createCheckoutSession } = require("./paymentController");
// Create new Order
exports.newOrder = asyncErrorCatch(async (req, res, next) => {
  let count = 0;
  if (!req.body.orderItems) {
    return next(new ErrorHandler(400, "Please enter order items"));
  }
  if (!req.body.itemsPrice) {
    return next(new ErrorHandler(400, "Please enter order items price"));
  }
  if (!req.body.platformFee) {
    return next(new ErrorHandler(400, "Platform fee not found"));
  }
  if (!req.body.totalPrice) {
    return next(new ErrorHandler(400, "Items Total not found"));
  }
  if (!req.body.user) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Store Id Not Found"));
  }
  // if (!req.body.tax) {
  //   return next(new ErrorHandler(400, "Please enter tax"));
  // }
  // if (!req.body.paymentInfo) {
  //     return next(new ErrorHandler(400, "Please enter payment info"))
  // }

  // if (!req.body.paymentInfo.transactionId) {
  //     return next(new ErrorHandler(400, "Please enter payment transaction Id"))
  // }

  // if (!req.body.paymentInfo.status) {
  //     return next(new ErrorHandler(400, "Please enter payment transaction status"))
  // }
  for (let j = 0; j < req.body?.orderItems?.length; j++) {
    if (!req.body.orderItems[j].productName) {
      return next(
        new ErrorHandler(
          400,
          `Please enter your${
            req.body.orderItems.length > 1 ? `${j + 1}` : ""
          } order item product name`
        )
      );
    } else if (!req.body.orderItems[j].price) {
      return next(
        new ErrorHandler(
          400,
          `Please enter your${
            req.body.orderItems.length > 1 ? `${j + 1}` : ""
          } order item product price`
        )
      );
    } else if (!req.body.orderItems[j].quantity) {
      return next(
        new ErrorHandler(
          400,
          `Please enter your${
            req.body.orderItems.length > 1 ? `${j + 1}` : ""
          } order item product quantity`
        )
      );
    } else if (!req.body.orderItems[j].product) {
      return next(
        new ErrorHandler(
          400,
          `Please enter your${
            req.body.orderItems.length > 1 ? `${j + 1}` : ""
          } order item product product Id`
        )
      );
    }
  }
  const {
    orderItems,
    itemsPrice,
    isOnlineOrder,
    platformFee,
    totalPrice,
    user,
    store,
    tax,
  } = req.body;
  let paymentInfo = { status: "pending", method: "stripe" };

  let productOrderQuantity = 0;

  if (isOnlineOrder) {
    const userCart = await cartModel.findOne({
      user: user,
      store: store,
      status: "active",
    });
    if (!userCart) {
      return next(new ErrorHandler(404, "User cart not found"));
    } else {
      cartModel.findOneAndDelete(
        { user: user, store: store, status: "active" },
        (err, result) => {
          if (err) {
            return next(400, err.message);
          } else {
            orderModel.create(
              {
                orderItems,
                paymentInfo,
                itemsPrice: parseFloat(itemsPrice).toFixed(2),
                isOnlineOrder,
                platformFee: parseFloat(platformFee).toFixed(2),
                totalPrice: parseFloat(totalPrice).toFixed(2),
                user,
                tax: parseFloat(tax).toFixed(2),
                orderType: isOnlineOrder ? "Promo Deals" : "InStore",
                //  orderType: isOnlineOrder ? "Promo Deals" : "InStore",
                orderStatus: isOnlineOrder
                  ? "665d924f0c58a92b7e224086"
                  : "665d924f0c58a92b7e224086",
                store,
              },
              async (err, result) => {
                if (err) {
                  return next(new ErrorHandler(400, err.message));
                }
                if (result) {
                  const orderList = await orderModel
                    .findById(result?._id)
                    .populate({
                      path: "orderItems.product",
                      populate: {
                        path: "category",
                      },
                    })
                    .populate("user");
                  const products = orderList?.orderItems?.map((orderItem) => ({
                    image: `${process.env.BaseUrl}/${orderItem.product.image}`,
                    productName: orderItem.product.productName,
                    quantity: orderItem.quantity,
                    price: orderItem.product.discountedPrice,
                    category: orderItem.product.category.categoryName,
                  }));

                  console.log(orderList, "orderList");
                  const message = `your email verification OTP is :- \n\n\n\n
            if you have not requested this email then please ignore it`;

                  const htmlTemplate = fs.readFileSync(
                    "./template/13-order-placed.html",
                    "utf8"
                  );
                  const compiledTemplate = handlebars.compile(htmlTemplate);
                  const htmlModified = compiledTemplate({
                    products,
                    orderNumber: result?._id,
                    orderMessage: "ORDER PLACED",
                    subtotal: result?.itemsPrice,
                    platformFee: result?.platformFee,
                    tax: result?.tax,
                    total: parseFloat(
                      (
                        result?.itemsPrice +
                        result?.platformFee +
                        result?.tax
                      ).toFixed(2)
                    ),
                  });

                  sendEmailWithTemplate({
                    email: orderList?.user?.email,
                    subject: "Skip A Line",
                    message,
                    htmlModified,
                  })
                    .then((data) => {})
                    .catch((err) => {});
                  // res.status(200).json({
                  //     code: result?._id,
                  //     success: true,
                  //     message: "Order placed successfully",
                  //     orderList
                  // });
                  createCheckoutSession(result, res);
                }
              }
            );
          }
        }
      );
    }
  }
  if (!isOnlineOrder) {
    for (let i = 0; i < orderItems?.length; i++) {
      productOrderQuantity = orderItems[i]?.quantity;
      const orderProduct = await productModel.findOne({
        _id: orderItems[i]?.product,
      });
      if (productOrderQuantity >= orderProduct?.quantity) {
        orderProduct.quantity = 0;
        orderProduct.save({ validateBeforeSave: false }, (err, result) => {
          if (err) {
            return next(new ErrorHandler(400, err.message));
          } else {
            count++;
            console.log("count if", count);
            if (count === orderItems?.length) {
              orderModel.create(
                {
                  orderItems,
                  paymentInfo,
                  itemsPrice: parseFloat(itemsPrice).toFixed(2),
                  isOnlineOrder,
                  platformFee: parseFloat(platformFee).toFixed(2),
                  totalPrice: parseFloat(totalPrice).toFixed(2),
                  tax: parseFloat(tax).toFixed(2),
                  user,
                  orderType: isOnlineOrder ? "Promo Deals" : "InStore",
                  orderStatus: isOnlineOrder
                    ? "665d924f0c58a92b7e224086"
                    : "665d924f0c58a92b7e224086",
                  store,
                },
                async (err, result) => {
                  if (err) {
                    return next(new ErrorHandler(400, err.message));
                  }
                  if (result) {
                    const orderList = await orderModel
                      .findById(result?._id)
                      .populate({
                        path: "orderItems.product",
                        populate: {
                          path: "category",
                        },
                      })
                      .populate("user");
                    const products = orderList?.orderItems?.map(
                      (orderItem) => ({
                        image: `${process.env.BaseUrl}/${orderItem.product.image}`,
                        productName: orderItem.product.productName,
                        quantity: orderItem.quantity,
                        price: orderItem.product.price,
                        category: orderItem.product.category.categoryName,
                      })
                    );

                    console.log(orderList, "orderList");
                    const message = `your email verification OTP is :- \n\n\n\n
                    if you have not requested this email then please ignore it`;

                    const htmlTemplate = fs.readFileSync(
                      "./template/13-order-placed.html",
                      "utf8"
                    );
                    const compiledTemplate = handlebars.compile(htmlTemplate);
                    const htmlModified = compiledTemplate({
                      products,
                      orderNumber: result?._id,
                      orderMessage: "ORDER PLACED",
                      subtotal: result?.itemsPrice,
                      platformFee: result?.platformFee,
                      tax: result?.tax,
                      total: parseFloat(
                        (
                          result?.itemsPrice +
                          result?.platformFee +
                          result?.tax
                        ).toFixed(2)
                      ),
                    });

                    sendEmailWithTemplate({
                      email: orderList?.user?.email,
                      subject: "Skip A Line",
                      message,
                      htmlModified,
                    })
                      .then((data) => {})
                      .catch((err) => {});

                    createCheckoutSession(result, res);
                    // res.status(201).json({
                    //   code: result?._id,
                    //   success: true,
                    //   message: "Order placed successfully",
                    //   orderList,
                    // });
                  }
                }
              );
            }
          }
        });
      } else {
        orderProduct.quantity -= orderItems[i]?.quantity;
        orderProduct.save({ validateBeforeSave: false }, (err, result) => {
          if (err) {
            return next(new ErrorHandler(400, err.message));
          } else {
            count++;
            console.log("count elde", count);
            if (count === orderItems?.length) {
              orderModel.create(
                {
                  orderItems,
                  paymentInfo,
                  itemsPrice: parseFloat(itemsPrice).toFixed(2),
                  isOnlineOrder,
                  platformFee: parseFloat(platformFee).toFixed(2),
                  totalPrice: parseFloat(totalPrice).toFixed(2),
                  tax: parseFloat(tax).toFixed(2),
                  user,
                  orderType: isOnlineOrder ? "Promo Deals" : "InStore",
                  orderStatus: isOnlineOrder
                    ? "665d924f0c58a92b7e224086"
                    : "665d924f0c58a92b7e224086",
                  store,
                },
                async (err, result) => {
                  if (err) {
                    return next(new ErrorHandler(400, err.message));
                  }
                  if (result) {
                    const orderList = await orderModel
                      .findById(result?._id)
                      .populate({
                        path: "orderItems.product",
                        populate: {
                          path: "category",
                        },
                      })
                      .populate("user");
                    const products = orderList?.orderItems?.map(
                      (orderItem) => ({
                        image: `${process.env.BaseUrl}/${orderItem.product.image}`,
                        productName: orderItem.product.productName,
                        quantity: orderItem.quantity,
                        price: orderItem.product.price,
                        category: orderItem.product.category.categoryName,
                      })
                    );

                    console.log(orderList, "orderList");
                    const message = `your email verification OTP is :- \n\n\n\n
                    if you have not requested this email then please ignore it`;

                    const htmlTemplate = fs.readFileSync(
                      "./template/13-order-placed.html",
                      "utf8"
                    );
                    const compiledTemplate = handlebars.compile(htmlTemplate);
                    const htmlModified = compiledTemplate({
                      products,
                      orderNumber: result?._id,
                      orderMessage: "ORDER PLACED",
                      subtotal: result?.itemsPrice,
                      platformFee: result?.platformFee,
                      tax: result?.tax,
                      total: parseFloat(
                        (result?.itemsPrice + 10.99).toFixed(2)
                      ),
                    });

                    sendEmailWithTemplate({
                      email: orderList?.user?.email,
                      subject: "Skip A Line",
                      message,
                      htmlModified,
                    })
                      .then((data) => {})
                      .catch((err) => {});
                    // res.status(200).json({
                    //     code: result?._id,
                    //     success: true,
                    //     message: "Order placed successfully",
                    //     orderList
                    // });

                    createCheckoutSession(result, res);
                  }
                }
              );
            }
          }
        });
      }
      console.log("count", count);

      // productModel.findOneAndUpdate(
      //     { _id: orderItems[i]?.product },
      //     { $inc: { quantity: -orderItems[i]?.quantity } },
      //     { new: true },
      //     (err, updated) => {
      //         console.log("de");
      //         if (err) {
      //             return next(new ErrorHandler(400, err.message));
      //         } else {
      //             console.log(updated);
      //             count++;
      //             console.log(count, "count");
      //             if (count === orderItems?.length) {
      //                 orderModel.create({
      //                     orderItems,
      //                     paymentInfo,
      //                     itemsPrice: parseFloat(itemsPrice).toFixed(2),
      //                     isOnlineOrder,
      //                     shippingPrice: parseFloat(shippingPrice).toFixed(2),
      //                     totalPrice: parseFloat(totalPrice).toFixed(2),
      //                     user,
      //                     orderType: isOnlineOrder ? "Promo Deals" : "InStore",
      //                     orderStatus: isOnlineOrder ? "64394488439d40de5a6f1243" : "641d64f1d225a66ae3f9a845",
      //                     store

      //                 }, (err, result) => {
      //                     if (err) {
      //                         return next(new ErrorHandler(400, err.message))
      //                     }
      //                     if (result) {

      //                         console.log(result, "result");

      //                         res.status(201).json({
      //                             code: result?._id,
      //                             success: true,
      //                             message: "Order placed successfully"
      //                         });
      //                     }
      //                 });

      //             }

      //         }
      //     }
      // );
    }
  }
});

exports.getAllUserOrdersByStoreOwner = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }

    const { orderType, orderStatusId, startDate, endDate } = req.body;

    let filters = {
      store: req.body.store,
    };

    if (orderType) {
      filters.orderType = orderType;
    }

    if (orderStatusId) {
      filters.orderStatus = orderStatusId;
    }

    if (startDate && endDate) {
      filters.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const order = await orderModel
      .find(filters, {
        _id: 1,
        user: 1,
        orderStatus: 1,
        itemsPrice: 1,
        platformFee: 1,
        orderType: 1,
        totalPrice: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .populate({ path: "user", select: "name email _id profile number" })
      .populate({ path: "orderStatus" });

    if (order.length === 0) {
      return next(new ErrorHandler(404, "Orders not found"));
    }

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      order,
    });
  }
);

// Updated getAllUserInStoreOrdersByStoreOwner for store Picks with date and time
exports.getAllUserInStoreOrdersByStoreOwner = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }

    const { orderType, startDate, endDate } = req.body;

    // Hard-coded order status IDs
    const orderStatusIds = [
      "665d924f0c58a92b7e224086",
      "665d96560c58a92b7e22408e",
      "665d965e0c58a92b7e224091",
    ];

    let filters = {
      store: req.body.store,
      orderStatus: { $in: orderStatusIds },
    };

    if (orderType) {
      filters.orderType = orderType;
    }

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.createdAt.$lte = new Date(endDate);
      }
    }

    const order = await orderModel
      .find(filters, {
        _id: 1,
        user: 1,
        orderStatus: 1,
        itemsPrice: 1,
        platformFee: 1,
        orderType: 1,
        totalPrice: 1,
        createdAt: 1,
        tax: 1,
      })
      .sort({ createdAt: -1 })
      .populate({ path: "user", select: "name email _id profile number" })
      .populate({ path: "orderStatus" });

    if (order?.length === 0) {
      return next(new ErrorHandler(404, "Orders not found"));
    }

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      order,
    });
  }
);

exports.getSingleOrderDetailByUser = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.user) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter order Id"));
  }
  const orders = await orderModel
    .findOne(
      { _id: req.body._id, store: req.body.store, user: req.body.user },
      {
        _id: 1,
        store: 1,
        orderStatus: 1,
        itemsPrice: 1,
        platformFee: 1,
        orderItems: 1,
        isOnlineOrder: 1,
        orderType: 1,
        paymentInfo: 1,
        tax: 1,
      }
    )
    .populate("orderStatus")
    .populate({
      path: "orderItems.product",
      populate: {
        path: "category",
      },
    })
    .populate({ path: "store" });
  if (!orders) {
    return next(new ErrorHandler(404, "No order found"));
  }
  // console.log(orders);
  res.status(200).json({
    success: true,
    code: req.body._id,
    orders,
    message: "order detail fetched successfully",
  });
  //   if(orders?.orderStatus?.statusType==="Ready"){
  //     let strData = JSON.stringify({orderId:req.body._id})
  //     qr.toDataURL(strData, function (err, code) {
  //         if(err) return console.log("error occurred")
  //         res.status(200).json({
  //             success: true,
  //             code,
  //             orders,
  //             message:"order detail fetched successfully"
  //         });
  // })
  //   }else{
  //     res.status(200).json({
  //         success: true,
  //         code:null,
  //         orders,
  //         message:"order detail fetched successfully"
  //     });
  //   }

  // qr.toString(strData, {type:'terminal'},function (err, code) {
  //     if(err) return next(new ErrorHandler(400,err.message))
  //     res.status(200).json({
  //         success: true,
  //         message:"Order detail fetched successfully",
  //         code,
  //         orders,
  //     });
  // });
});

exports.getSingleOrderDetailByStoreOwner = asyncErrorCatch(
  async (req, res, next) => {
    // if (!req.body.user) {
    //     return next(new ErrorHandler(400, "Please enter user Id"))
    // }
    // if (!req.body.store) {
    //     return next(new ErrorHandler(400, "Please enter store Id"))
    // }
    if (!req.body._id) {
      return next(new ErrorHandler(400, "Please enter order Id"));
    }
    const order = await orderModel
      .findOne(
        { _id: req.body._id },
        {
          _id: 1,
          user: 1,
          orderStatus: 1,
          itemsPrice: 1,
          platformFee: 1,
          totalPrice: 1,
          orderItems: 1,
          paymentInfo: 1,
          tax: 1,
        }
      )
      .populate("user", "name email _id profile number")
      .populate("orderStatus")
      .populate({
        path: "orderItems.product",
        select: "isAvailableInOffer image",
      });
    console.log(order);
    if (!order) {
      return next(new ErrorHandler(404, "Orders not found "));
    }

    res.status(200).json({
      success: true,
      message: "Order detail fetched successfully",
      order,
    });
  }
);
exports.getSingleOrderDetailByStoreOwnerUsi = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.user) {
      return next(new ErrorHandler(400, "Please enter user Id"));
    }
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }
    if (!req.body._id) {
      return next(new ErrorHandler(400, "Please enter order Id"));
    }
    const order = await orderModel
      .findOne(
        { _id: req.body._id, user: req.body.user, store: req.body.store },
        {
          _id: 1,
          user: 1,
          orderStatus: 1,
          itemsPrice: 1,
          platformFee: 1,
          totalPrice: 1,
          orderItems: 1,
        }
      )
      .populate("user", "name email _id profile number")
      .populate("orderStatus")
      .populate({
        path: "orderItems.product",
        select: "isAvailableInOffer image",
      });
    console.log(order);
    if (!order) {
      return next(new ErrorHandler(404, "Orders not found "));
    }

    res.status(200).json({
      success: true,
      message: "Order detail fetched successfully",
      order,
    });
  }
);

// Updated getUSerOwnOrders with date and Time
exports.getUSerOwnOrders = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.user) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }

  const { orderType, orderStatusId, startDate, endDate } = req.body;

  let filters = {
    user: req.body.user,
  };

  if (orderType) {
    filters.orderType = orderType;
  }

  if (orderStatusId) {
    filters.orderStatus = orderStatusId;
  }

  if (startDate || endDate) {
    filters.createdAt = {};
    if (startDate) {
      filters.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filters.createdAt.$lte = new Date(endDate);
    }
  }

  const order = await orderModel
    .find(filters, {
      _id: 1,
      store: 1,
      orderStatus: 1,
      itemsPrice: 1,
      platformFee: 1,
      isOnlineOrder: 1,
      orderType: 1,
      orderItems: 1,
      totalPrice: 1,
      createdAt: 1,
    })
    .sort({ createdAt: -1 })
    .populate("store")
    .populate("orderStatus");

  if (order?.length === 0) {
    return next(new ErrorHandler(404, "Orders not found"));
  }

  res.status(200).json({
    success: true,
    message: "Orders fetched successfully",
    order,
  });
});

// New getUSerInstoreOwnOrders with date and time
exports.getUSerInstoreOwnOrders = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.user) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }

  const { orderType, startDate, endDate } = req.body;

  // Hard-coded order status IDs
  const orderStatusIds = [
    "665d924f0c58a92b7e224086",
    "665d96560c58a92b7e22408e",
    "665d965e0c58a92b7e224091",
  ];

  let filters = {
    user: req.body.user,
    orderStatus: { $in: orderStatusIds },
  };

  if (orderType) {
    filters.orderType = orderType;
  }

  if (startDate || endDate) {
    filters.createdAt = {};
    if (startDate) {
      filters.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filters.createdAt.$lte = new Date(endDate);
    }
  }

  const order = await orderModel
    .find(filters, {
      _id: 1,
      store: 1,
      orderStatus: 1,
      itemsPrice: 1,
      platformFee: 1,
      isOnlineOrder: 1,
      orderType: 1,
      orderItems: 1,
      createdAt: 1,
      tax: 1,
      totalPrice: 1,
    })
    .sort({ createdAt: -1 })
    .populate("store")
    .populate("orderStatus");

  if (order?.length === 0) {
    return next(new ErrorHandler(404, "Orders not found"));
  }

  res.status(200).json({
    success: true,
    message: "Orders fetched successfully",
    order,
  });
});

// update Order Status Store Owner
exports.updateUserOrderStatus = asyncErrorCatch(async (req, res, next) => {
  // if (!req.body.user) {
  //     return next(new ErrorHandler(400, "Please enter user Id"))
  // }
  // if (!req.body.store) {
  //     return next(new ErrorHandler(400, "Please enter store Id"))
  // }
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter order Id"));
  }
  if (!req.body.orderStatusId) {
    return next(new ErrorHandler(400, "Please enter order status Id"));
  }
  const order = await orderModel.findOne({ _id: req.body._id });

  if (!order) {
    return next(new ErrorHandler(404, "Order not found with this Id"));
  }
  order.orderStatus = req.body.orderStatusId;
  await order.save({ validateBeforeSave: false });

  const orderList = await orderModel
    .findById(req.body._id)
    .populate({
      path: "orderItems.product",
      populate: {
        path: "category",
      },
    })
    .populate("user");
  const products = orderList?.orderItems?.map((orderItem) => ({
    image: `${process.env.BaseUrl}/${orderItem.product.image}`,
    productName: orderItem.product.productName,
    quantity: orderItem.quantity,
    price: orderItem.product.price,
    category: orderItem.product.category.categoryName,
  }));

  const message = `your email verification OTP is :- \n\n\n\n
if you have not requested this email then please ignore it`;

  const htmlTemplate = fs.readFileSync(
    "./template/13-order-placed.html",
    "utf8"
  );
  const compiledTemplate = handlebars.compile(htmlTemplate);
  let orderMsg = "";
  if (req.body.orderStatusId === "665d924f0c58a92b7e224086") {
    orderMsg = "ORDER IS PENDING";
  } else if (req.body.orderStatusId === "665d96560c58a92b7e22408e") {
    orderMsg = "ORDER IS READY";
  } else if (req.body.orderStatusId === "665d965e0c58a92b7e224091") {
    orderMsg = "ORDER COMPLETED";
  }
  const htmlModified = compiledTemplate({
    products,
    orderNumber: order?._id,
    orderMessage: orderMsg,
    subtotal: order?.itemsPrice,
    platformFee: result?.platformFee,
    tax: result?.tax,
    total: parseFloat((order?.itemsPrice + result?.platformFee).toFixed(2)),
  });

  sendEmailWithTemplate({
    email: orderList?.user?.email,
    subject: "Skip A Line",
    message,
    htmlModified,
  })
    .then((data) => {})
    .catch((err) => {});
  res.status(200).json({
    success: true,
    message: "Order status updated",
  });
});

const updateStock = async (id, quantity) => {
  const product = await productModel.findById(id);

  product.quantity -= quantity;

  return await product.save({ validateBeforeSave: false });
};
// exports.getAllOrdersOfSingleStore = asyncErrorCatch(async (req, res, next) => {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const ordersQuery = orderModel.find({ store: req.params.id }).sort({createdAt:-1}).populate("user orderStatus");
//     const countQuery = orderModel.countDocuments({ store: req.params.id });

//     const orders = await ordersQuery.skip(skip).limit(limit);
//     const totalOrders = await countQuery;

//     res.status(200).json({ success: true, orders, totalOrders });
//   });

exports.getAllOrdersOfSingleStore = asyncErrorCatch(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const startDate = req?.query?.startDate;
  const endDate = req?.query?.endDate;

  const query = { store: req.params.id };

  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  console.log(req.query);
  const ordersQuery = orderModel
    .find(query)
    .sort({ createdAt: -1 })
    .populate("user orderStatus");
  console.log(ordersQuery);
  const countQuery = orderModel.countDocuments(query);

  const orders = await ordersQuery.skip(skip).limit(limit);

  const totalOrders = await countQuery;

  res.status(200).json({ success: true, orders, totalOrders });
});

//   exports.getAllOrdersOfSingleUser = asyncErrorCatch(async (req, res, next) => {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const ordersQuery = orderModel.find({ user: req.params.id }).sort({createdAt:-1}).populate("user store orderStatus");
//     const countQuery = orderModel.countDocuments({ user: req.params.id });

//     const orders = await ordersQuery.skip(skip).limit(limit);
//     const totalOrders = await countQuery;

//     res.status(200).json({ success: true, orders, totalOrders });
//   });
exports.getAllOrdersOfSingleUser = asyncErrorCatch(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const startDate = req?.query?.startDate;
  const endDate = req?.query?.endDate;

  const query = { user: req.params.id };

  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const ordersQuery = orderModel
    .find(query)
    .sort({ createdAt: -1 })
    .populate("user store orderStatus");
  const countQuery = orderModel.countDocuments(query);

  const orders = await ordersQuery.skip(skip).limit(limit);
  const totalOrders = await countQuery;

  res.status(200).json({ success: true, orders, totalOrders });
});

exports.getSingleStoreOrderDetail = asyncErrorCatch(async (req, res, next) => {
  const order = await orderModel
    .findOne({ _id: req.params.id })
    .populate("user store orderStatus")
    .populate({ path: "orderItems.product", populate: { path: "category" } });
  res.status(200).json({ success: true, order });
});

// exports.getTotalEarningsInstore=asyncErrorCatch(async(req,res,next)=>{
//     if(!req.body.store){
//         return next(new ErrorHandler(400,"Please enter store Id"))
//     }
//     const orders=await orderModel.find({store:req.body.store,orderType:"InStore"}).populate({path:"orderStatus"});
//     if(!orders){
//         return next(new ErrorHandler(400,"No order Found"))
//     }

//     let totalPrice=0,totalOrders=0,completedOrders=0,ongoingOrders=0;
//     for(let order of orders){
//         totalPrice+=order.totalPrice;
//         totalOrders=orders?.length;
//         if(order?.orderStatus?.statusType==="Completed"){
//             completedOrders+=1
//         }
//         if(order?.orderStatus?.statusType==="Ongoing"){
//             ongoingOrders+=1
//         }
//     }
//     res.status(200).json({success:true,totalEarning:totalPrice,totalOrders,completedOrders,ongoingOrders})

// })

//accurate fucntioo

// exports.getTotalEarningsInstore = asyncErrorCatch(async (req, res, next) => {
//     if (!req.body.store) {
//         return next(new ErrorHandler(400, "Please enter store Id"));
//     }
//     if (!req.body.duration) {
//         return next(new ErrorHandler(400, "Please select duration"));
//     }

//     const duration = req.body.duration;
//     let startDate = null;

//     switch (duration) {
//         case 'today':
//             startDate = moment().startOf('day');
//             break;
//         case '3days':
//             startDate = moment().subtract(3, 'days').startOf('day');
//             break;
//         case '1week':
//             startDate = moment().subtract(1, 'week').startOf('day');
//             break;
//         case '1month':
//             startDate = moment().subtract(1, 'month').startOf('day');
//             break;
//         case '3months':
//             startDate = moment().subtract(3, 'months').startOf('day');
//             break;
//         case '6months':
//             startDate = moment().subtract(6, 'months').startOf('day');
//             break;
//         case '1year':
//             startDate = moment().subtract(1, 'year').startOf('day');
//             break;
//         case 'all':
//             break;
//         default:
//             return next(new ErrorHandler(400, "Invalid duration"));
//     }

//     const query = { store: req.body.store };
//     if (startDate) {
//         query.createdAt = { $gte: startDate };
//     }
//     const orders = await orderModel.find(query).populate({ path: "orderStatus" });
//     let storeEarning = 0, storeOrders = 0, storeOngoingOrders = 0, storeCompletedOrders = 0, offerEarning = 0, earningArray = [];

//     for (let order of orders) {
//         if (order?.orderType === "InStore") {
//             storeEarning += order.totalPrice;
//             storeOrders += 1;
//             if (order?.orderStatus?.statusType === "Completed") {
//                 storeCompletedOrders += 1;
//             }
//             if (order?.orderStatus?.statusType === "Paid") {
//                 storeOngoingOrders += 1;
//             }

//             // calculate earnings array
//             const orderDate = moment(order.createdAt).startOf('day');
//             const earningObjIndex = earningArray.findIndex(obj => obj.date.isSame(orderDate));
//             if (earningObjIndex !== -1) {
//                 earningArray[earningObjIndex].totalEarning += order.totalPrice;
//             } else {
//                 earningArray.push({
//                     date: orderDate,
//                     totalEarning: order.totalPrice
//                 });
//             }
//         }
//     }

//     let earningArrayResult = [];

//     switch (duration) {
//         case 'today':
//             earningArrayResult = [earningArray.find(obj => obj.date.isSame(moment().startOf('day'))) || { date: moment().startOf('day'), totalEarning: 0 }];
//             break;
//         case '3days':
//             for (let i = 0; i < 3; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '1week':
//             for (let i = 0; i < 7; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '1month':
//             for (let i = 0; i < 30; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '3months':
//             for (let i = 0; i < 90; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '6months':
//             for (let i = 0; i < 180; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '1year':
//             for (let i = 0; i < 365; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case 'all':
//             for (let i = 0; i < 365; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         default:
//             break;
//     }

//     const formattedEarningArray = earningArrayResult.map(obj => {
//         return {
//             date: obj.date.format('DD-MM-YYYY'),
//             totalEarning: Number(obj.totalEarning.toFixed(2))
//         }
//     });

//     console.log(formattedEarningArray);

//     let InStore = {
//         storeEarning: parseFloat(storeEarning).toFixed(2),
//         storeOrders: storeOrders,
//         storeCompletedOrders: storeCompletedOrders,
//         storeOngoingOrders: storeOngoingOrders,
//     }

//     res.status(200).json({
//         success: true,
//         inStore: InStore,
//         earningArray: formattedEarningArray
//     });

//     // let earningData = [], storeEarning = 0, storeOrders = 0, storeOngoingOrders = 0, storeCompletedOrders = 0, offerEarning = 0, offerOrders = 0, offerInProgressOrders = 0, offerCompletedOrders = 0;
//     // for (let order of orders) {
//     //     if (order?.orderType === "InStore") {
//     //         storeEarning += order.totalPrice;
//     //         storeOrders += 1;
//     //         if (order?.orderStatus?.statusType === "Completed") {
//     //             storeCompletedOrders += 1;
//     //         }
//     //         if (order?.orderStatus?.statusType === "Ongoing") {
//     //             storeOngoingOrders += 1;
//     //         }
//     //         earningData.push({
//     //             date: moment(order.createdAt).format('YYYY-MM-DD'),
//     //             earning: order.totalPrice
//     //         });
//     //         // if(order?.orderType==="Promo Deals"){
//     //         //     offerEarning += order.totalPrice;
//     //         //     offerOrders +=1;
//     //         //     if (order?.orderStatus?.statusType === "Completed") {
//     //         //         offerCompletedOrders += 1;
//     //         //     }
//     //         //     if (order?.orderStatus?.statusType === "InProgress") {
//     //         //         offerInProgressOrders += 1;
//     //         //     }
//     //         // }
//     //         // totalEarning += order.totalPrice;
//     //         // totalOrders = orders?.length;
//     //         // if (order?.orderStatus?.statusType === "Completed") {
//     //         //     totalCompletedOrders += 1;
//     //         // }
//     //         // if (order?.orderStatus?.statusType === "Ongoing") {
//     //         //     totalOngoingOrders += 1;
//     //         // }
//     //         // if (order?.orderStatus?.statusType === "InProgress") {
//     //         //     totalInProgressOrders += 1;
//     //         // }
//     //     }
//     // }

//     // // let allOrders ={
//     // //         totalEarnings: totalEarning,
//     // //         totalOrders: totalOrders,
//     // //         totalCompletedOrders: totalCompletedOrders,
//     // //         totalOngoingOrders: totalOngoingOrders,
//     // //         totalInProgressOrders:totalInProgressOrders
//     // //     }

//     // let InStore = {
//     //     storeEarning: storeEarning,
//     //     storeOrders: storeOrders,
//     //     storeCompletedOrders: storeCompletedOrders,
//     //     storeOngoingOrders: storeOngoingOrders,
//     // }

//     // // let Promo Deals ={
//     // //     offerEarning: offerEarning,
//     // //     offerOrders: offerOrders,
//     // //     offerCompletedOrders: offerCompletedOrders,
//     // //     offerInProgressOrders:offerInProgressOrders
//     // // }

//     // res.status(200).json({
//     //     success: true,
//     //     inStore: InStore,
//     //     earningData: earningData

//     // });
// });

exports.getTotalEarningsInstore = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.startDate || !req.body.endDate) {
    return next(new ErrorHandler(400, "Please select start and end dates"));
  }

  // const startDate = moment(req.body.startDate).startOf('day');
  // const endDate = moment(req.body.endDate).startOf('day');
  const startDate = moment(req.body.startDate).set({
    hour: 0,
    minute: 0,
    second: 0,
  });
  const endDate = moment(req.body.endDate).set({
    hour: 23,
    minute: 59,
    second: 59,
  });

  const query = {
    store: req.body.store,
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const orders = await orderModel.find(query).populate({ path: "orderStatus" });
  console.log(orders);
  let storeEarning = 0,
    storeOrders = 0,
    storeOngoingOrders = 0,
    storeCompletedOrders = 0,
    earningArray = [];

  // Create a set of all existing dates in the orders
  const existingDatesSet = new Set(
    orders.map((order) =>
      moment(order.createdAt).startOf("day").format("YYYY-MM-DD")
    )
  );

  // Iterate over the date range from start to end
  const currentDate = moment(startDate);
  while (currentDate.isSameOrBefore(endDate)) {
    const currentDateFormatted = currentDate.format("YYYY-MM-DD");

    // Check if the current date exists in the orders
    const existingDate = existingDatesSet.has(currentDateFormatted);

    if (existingDate) {
      // Find the order for the current date
      const order = orders.find(
        (order) =>
          moment(order.createdAt).startOf("day").format("YYYY-MM-DD") ===
          currentDateFormatted
      );
      if (order?.orderType === "InStore") {
        storeEarning += order.totalPrice;
        storeOrders += 1;
        if (order?.orderStatus?.statusType === "Completed") {
          storeCompletedOrders += 1;
        }
        if (order?.orderStatus?.statusType === "Paid") {
          storeOngoingOrders += 1;
        }

        // calculate earnings array
        const orderDate = moment(order.createdAt).startOf("day");
        const earningObjIndex = earningArray.findIndex((obj) =>
          obj.date.isSame(orderDate)
        );
        if (earningObjIndex !== -1) {
          earningArray[earningObjIndex].totalEarning += order.totalPrice;
        } else {
          earningArray.push({
            date: orderDate,
            totalEarning: order.totalPrice,
          });
        }
      }
    } else {
      // Add the current date with earnings set to 0
      earningArray.push({
        date: moment(currentDate).startOf("day"),
        totalEarning: 0,
      });
    }

    // Move to the next date
    currentDate.add(1, "day");
  }

  const formattedEarningArray = earningArray.map((obj) => {
    return {
      date: obj.date.format("DD-MM-YYYY"),
      totalEarning: Number(obj.totalEarning.toFixed(2)),
    };
  });

  let inStore = {
    storeEarning: parseFloat(storeEarning).toFixed(2),
    storeOrders: storeOrders,
    storeCompletedOrders: storeCompletedOrders,
    storeOngoingOrders: storeOngoingOrders,
  };

  res.status(200).json({
    success: true,
    inStore: inStore,
    earningArray: formattedEarningArray,
  });
});

exports.getTotalEarningsInOffer = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.startDate || !req.body.endDate) {
    return next(new ErrorHandler(400, "Please select start and end dates"));
  }

  // const startDate = moment(req.body.startDate).startOf('day');
  // const endDate = moment(req.body.endDate).startOf('day');

  const startDate = moment(req.body.startDate).set({
    hour: 0,
    minute: 0,
    second: 0,
  });
  const endDate = moment(req.body.endDate).set({
    hour: 23,
    minute: 59,
    second: 59,
  });

  const query = {
    store: req.body.store,
    orderType: "Promo Deals",
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const orders = await orderModel.find(query).populate({ path: "orderStatus" });
  // let storeEarning = 0, storeOrders = 0, storeOngoingOrders = 0, storeCompletedOrders = 0, earningArray = [];
  console.log(orders);
  let offerEarning = 0,
    offerOrders = 0,
    offerInProgressOrders = 0,
    offerCompletedOrders = 0,
    earningArray = [];

  // Create a set of all existing dates in the orders
  const existingDatesSet = new Set(
    orders.map((order) =>
      moment(order.createdAt).startOf("day").format("YYYY-MM-DD")
    )
  );

  // Iterate over the date range from start to end
  const currentDate = moment(startDate);
  while (currentDate.isSameOrBefore(endDate)) {
    const currentDateFormatted = currentDate.format("YYYY-MM-DD");

    // Check if the current date exists in the orders
    const existingDate = existingDatesSet.has(currentDateFormatted);

    if (existingDate) {
      // Find the order for the current date
      const order = orders.find(
        (order) =>
          moment(order.createdAt).startOf("day").format("YYYY-MM-DD") ===
          currentDateFormatted
      );
      console.log("order detail", order);
      if (order?.orderType === "Promo Deals") {
        console.log("comes");
        offerEarning += order.totalPrice;
        // offerOrders += 1;
        if (order?.orderStatus?.statusType === "Completed") {
          console.log("comes1");
          offerCompletedOrders += 1;
        }
        if (order?.orderStatus?.statusType === "In Progress") {
          offerInProgressOrders += 1;
        }
        if (order?.orderStatus?.statusType === "Ready") {
          offerOrders += 1;
        }

        // calculate earnings array
        const orderDate = moment(order.createdAt).startOf("day");
        const earningObjIndex = earningArray.findIndex((obj) =>
          obj.date.isSame(orderDate)
        );
        if (earningObjIndex !== -1) {
          earningArray[earningObjIndex].totalEarning += order.totalPrice;
        } else {
          earningArray.push({
            date: orderDate,
            totalEarning: order.totalPrice,
          });
        }
      }
    } else {
      // Add the current date with earnings set to 0
      earningArray.push({
        date: moment(currentDate).startOf("day"),
        totalEarning: 0,
      });
    }

    // Move to the next date
    currentDate.add(1, "day");
  }

  const formattedEarningArray = earningArray.map((obj) => {
    return {
      date: obj.date.format("DD-MM-YYYY"),
      totalEarning: Number(obj.totalEarning.toFixed(2)),
    };
  });

  let inOffer = {
    offerEarning: parseFloat(offerEarning).toFixed(2),
    offerOrders: offerOrders,
    offerCompletedOrders: offerCompletedOrders,
    offerInProgressOrders: offerInProgressOrders,
  };

  res.status(200).json({
    success: true,
    inOffer: inOffer,
    earningArray: formattedEarningArray,
  });
});

// exports.getTotalEarningsInOffer = asyncErrorCatch(async(req, res, next) => {
//     if (!req.body.store) {
//         return next(new ErrorHandler(400, "Please enter store Id"));
//     }
//     if (!req.body.duration) {
//         return next(new ErrorHandler(400, "Please select duration"));
//     }

//     const duration = req.body.duration;
//     let startDate = null;

//     switch (duration) {
//         case 'today':
//             startDate = moment().startOf('day');
//             break;
//         case '3days':
//             startDate = moment().subtract(3, 'days').startOf('day');
//             break;
//         case '1week':
//             startDate = moment().subtract(1, 'week').startOf('day');
//             break;
//         case '1month':
//             startDate = moment().subtract(1, 'month').startOf('day');
//             break;
//         case '3months':
//             startDate = moment().subtract(3, 'months').startOf('day');
//             break;
//         case '6months':
//             startDate = moment().subtract(6, 'months').startOf('day');
//             break;
//         case '1year':
//             startDate = moment().subtract(1, 'year').startOf('day');
//             break;
//         case 'all':
//             break;
//         default:
//             return next(new ErrorHandler(400, "Invalid duration"));
//     }

//     const query = { store: req.body.store };
//     if (startDate) {
//         query.createdAt = { $gte: startDate };
//     }
//     const orders = await orderModel.find(query).populate({ path: "orderStatus" });

//  let  offerEarning=0,offerOrders=0,offerInProgressOrders=0,offerCompletedOrders=0;
//     for (let order of orders) {
//         if(order?.orderType==="Promo Deals"){
//             offerEarning += order.totalPrice;
//             offerOrders +=1;
//             if (order?.orderStatus?.statusType === "Completed") {
//                 offerCompletedOrders += 1;
//             }
//             if (order?.orderStatus?.statusType === "InProgress") {
//                 offerInProgressOrders += 1;
//             }
//         }

//     }

//     let Promo Deals ={
//         offerEarning: offerEarning,
//         offerOrders: offerOrders,
//         offerCompletedOrders: offerCompletedOrders,
//         offerInProgressOrders:offerInProgressOrders
//     }

//     res.status(200).json({
//         success: true,
//         inOffer:Promo Deals,

//     });
// });

//   exports.getTotalEarningsInstore = asyncErrorCatch(async(req, res, next) => {
//     if (!req.body.store) {
//       return next(new ErrorHandler(400, "Please enter store Id"));
//     }
//     if (!req.body.duration) {
//         return next(new ErrorHandler(400, "Please select duration"));
//       }
//     const duration = req.body.duration;
//     let startDate = null;

//     switch (duration) {
//       case 'today':
//         startDate = moment().startOf('day');
//         break;
//       case '3days':
//         startDate = moment().subtract(3, 'days').startOf('day');
//         break;
//       case '1week':
//         startDate = moment().subtract(1, 'week').startOf('day');
//         break;
//       case '1month':
//         startDate = moment().subtract(1, 'month').startOf('day');
//         break;
//       case '3months':
//         startDate = moment().subtract(3, 'months').startOf('day');
//         break;
//       case '6months':
//         startDate = moment().subtract(6, 'months').startOf('day');
//         break;
//       case '1year':
//         startDate = moment().subtract(1, 'year').startOf('day');
//         break;
//       case 'all':
//         break;
//       default:
//         return next(new ErrorHandler(400, "Invalid duration"));
//     }

//     const query = { store: req.body.store, orderType: "InStore" };
//     if (startDate) {
//       query.createdAt = { $gte: startDate };
//     }
//     const orders = await orderModel.find(query).populate({ path: "orderStatus" });
//     if (!orders) {
//       return next(new ErrorHandler(400, "No order Found"));
//     }
//     console.log(orders);
//     let totalPrice = 0,
//       totalOrders = 0,
//       completedOrders = 0,
//       ongoingOrders = 0;
//     for (let order of orders) {
//       totalPrice += order.totalPrice;
//       totalOrders = orders?.length;
//       if (order?.orderStatus?.statusType === "Completed") {
//         completedOrders += 1;
//       }
//       if (order?.orderStatus?.statusType === "Ongoing") {
//         ongoingOrders += 1;
//       }
//     }
//     res.status(200).json({
//       success: true,
//       totalEarning: totalPrice,
//       totalOrders,
//       completedOrders,
//       ongoingOrders,
//     });
//   });

// exports.getAllOngoingOrders=asyncErrorCatch(async(req,res,next)=>{
//     if(!req.body.store){
//         return next(new ErrorHandler(400,"Please enter store Id"))
//     }
//     const orders=await orderModel.find({store:req.body.store});
//     if(!orders){
//         return next(new ErrorHandler(400,"No store Found"))
//     }

//     res.status(200).json({success:true,totalEarning:totalPrice})

// })

// exports.getAllCompletedOrders=asyncErrorCatch(async(req,res,next)=>{
//     if(!req.body.store){
//         return next(new ErrorHandler(400,"Please enter store Id"))
//     }
//     const orders=await orderModel.find({store:req.body.store});
//     if(!orders){
//         return next(new ErrorHandler(400,"No store Found"))
//         }
//     let totalPrice=0;
//     for(let order of orders){
//         totalPrice+=order.totalPrice;
//     }
//     res.status(200).json({success:true,totalEarning:totalPrice})

// })

// exports.getTotalEarningsInOffer = asyncErrorCatch(async (req, res, next) => {
//     if (!req.body.store) {
//         return next(new ErrorHandler(400, "Please enter store Id"));
//     }
//     if (!req.body.duration) {
//         return next(new ErrorHandler(400, "Please select duration"));
//     }

//     const duration = req.body.duration;
//     let startDate = null;

//     switch (duration) {
//         case 'today':
//             startDate = moment().startOf('day');
//             break;
//         case '3days':
//             startDate = moment().subtract(3, 'days').startOf('day');
//             break;
//         case '1week':
//             startDate = moment().subtract(1, 'week').startOf('day');
//             break;
//         case '1month':
//             startDate = moment().subtract(1, 'month').startOf('day');
//             break;
//         case '3months':
//             startDate = moment().subtract(3, 'months').startOf('day');
//             break;
//         case '6months':
//             startDate = moment().subtract(6, 'months').startOf('day');
//             break;
//         case '1year':
//             startDate = moment().subtract(1, 'year').startOf('day');
//             break;
//         case 'all':
//             break;
//         default:
//             return next(new ErrorHandler(400, "Invalid duration"));
//     }

//     const query = { store: req.body.store };
//     if (startDate) {
//         query.createdAt = { $gte: startDate };
//     }
//     const orders = await orderModel.find(query).populate({ path: "orderStatus" });

//     let offerEarning = 0,
//         offerOrders = 0,
//         offerInProgressOrders = 0,
//         offerCompletedOrders = 0,
//         earningArray = [];

//     for (let order of orders) {
//         if (order?.orderType === "Promo Deals") {
//             offerEarning += order.totalPrice;
//             offerOrders += 1;
//             if (order?.orderStatus?.statusType === "Completed") {
//                 offerCompletedOrders += 1;
//             }
//             if (order?.orderStatus?.statusType === "InProgress") {
//                 offerInProgressOrders += 1;
//             }

//             // calculate earnings array
//             const orderDate = moment(order.createdAt).startOf('day');
//             const earningObjIndex = earningArray.findIndex(obj => obj.date.isSame(orderDate));
//             if (earningObjIndex !== -1) {
//                 earningArray[earningObjIndex].totalEarning += order.totalPrice;
//             } else {
//                 earningArray.push({
//                     date: orderDate,
//                     totalEarning: order.totalPrice
//                 });
//             }
//         }
//     }

//     let earningArrayResult = [];

//     switch (duration) {
//         case 'today':
//             earningArrayResult = [earningArray.find(obj => obj.date.isSame(moment().startOf('day'))) || { date: moment().startOf('day'), totalEarning: 0 }];
//             break;
//         case '3days':
//             for (let i = 0; i < 3; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '1week':
//             for (let i = 0; i < 7; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '1month':
//             for (let i = 0; i < 30; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '3months':
//             for (let i = 0; i < 90; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '6months':
//             for (let i = 0; i < 180; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case '1year':
//             for (let i = 0; i < 365; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         case 'all':
//             for (let i = 0; i < 365; i++) {
//                 const date = moment().subtract(i, 'days').startOf('day');
//                 const earningObj = earningArray.find(obj => obj.date.isSame(date)) || { date, totalEarning: 0 };
//                 earningArrayResult.push(earningObj);
//             }
//             break;
//         default:
//             break;
//     }

//     const formattedEarningArray = earningArrayResult.map(obj => {
//         return {
//             date: obj.date.format('DD-MM-YYYY'),
//             totalEarning: Number(obj.totalEarning.toFixed(2))
//         }
//     });

//     console.log(formattedEarningArray);

//     let inOffer = {
//         offerEarning: parseFloat(offerEarning).toFixed(2),
//         offerOrders: offerOrders,
//         offerCompletedOrders: offerCompletedOrders,
//         offerInProgressOrders: offerInProgressOrders,

//     }

//     res.status(200).json({
//         success: true,
//         inOffer: inOffer,
//         earningArray: formattedEarningArray
//     });
// })
