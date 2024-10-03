//const stripe = require('stripe')("sk_test_51NYWGKGjmyRB2WqMhoYUaIErrL26dOGguh9ryDLLMtdEYPxPQICiOKFiG6nTuYyAqIxe8qNExJyd82Qp3TVfFMIH00wM8QnkXU");
const stripe = require("stripe")(
  "sk_test_51NYWGKGjmyRB2WqMhoYUaIErrL26dOGguh9ryDLLMtdEYPxPQICiOKFiG6nTuYyAqIxe8qNExJyd82Qp3TVfFMIH00wM8QnkXU"
);
const storeModel = require("../models/store");
const orderModel = require("../models/order");
const cartModel = require('../models/cart');
const path = require("path");

exports.createCheckoutSession = async (order, res, next) => {
  console.log(order);
  try {
    const { store, orderItems, platformFee, tax } = order;
    const orderStore = await storeModel.findById(store);
    // const platformFee = 500;

    let line_items = [];
    orderItems.forEach((element) => {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: element.productName },
          unit_amount: Math.round(element.price * 100),
        },
        quantity: element.quantity,
      });
    });

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Platform Fee" },
        unit_amount: Math.round(platformFee * 100),
      },
      quantity: 1,
    });

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Tax" },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });

    // Create PaymentIntent
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount:
    //     orderItems.reduce(
    //       (sum, item) => sum + item.price * 100 * item.quantity,
    //       0
    //     ) +
    //     platformFee +
    //     tax,
    //   currency: "usd",
    //   application_fee_amount: platformFee,
    //   transfer_data: {
    //     destination: orderStore.stripeConnectedAccountId, //'acct_1PWhEc2ezAIxHOBh' //orderStore.stripeConnectedAccountId,
    //   },
    // });

    // Create Checkout Session with the created PaymentIntent
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: Math.round(platformFee * 100),
        transfer_data: {
          destination: orderStore.stripeConnectedAccountId,
        },
      },
      success_url: `${process.env.BaseUrl}/api/v1/payment/payment-success?orderId=${order._id}&transactionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BaseUrl}/api/v1/payment/payment-failed?orderId=${order._id}`,
    });
    return res.json({
      status: "success",
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    console.error("Error creating checkout session: ", error);
    //next(error); // Pass error to the next middleware or error handler
  }
};

exports.creatependingCheckoutSession = async (order, res, next) => {
  console.log(order.body);
  try {
    const { store, orderItems, platformFee, tax } = order.body;
    const orderStore = await storeModel.findById(store);
    // const platformFee = 500;

    let line_items = [];
    orderItems.forEach((element) => {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: element.productName },
          unit_amount: Math.round(element.price * 100),
        },
        quantity: element.quantity,
      });
    });

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Platform Fee" },
        unit_amount: Math.round(platformFee * 100),
      },
      quantity: 1,
    });

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Tax" },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });

    // Create PaymentIntent
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount:
    //     orderItems.reduce(
    //       (sum, item) => sum + item.price * 100 * item.quantity,
    //       0
    //     ) +
    //     platformFee +
    //     tax,
    //   currency: "usd",
    //   application_fee_amount: platformFee,
    //   transfer_data: {
    //     destination: orderStore.stripeConnectedAccountId, //'acct_1PWhEc2ezAIxHOBh' //orderStore.stripeConnectedAccountId,
    //   },
    // });

    // Create Checkout Session with the created PaymentIntent
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: Math.round(platformFee * 100),
        transfer_data: {
          destination: orderStore.stripeConnectedAccountId,
        },
      },
      success_url: `${process.env.BaseUrl}/api/v1/payment/payment-success?orderId=${order.body._id}&transactionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BaseUrl}/api/v1/payment/payment-failed?orderId=${order.body._id}`,
    });
    return res.json({
      status: "success",
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    console.error("Error creating checkout session: ", error);
    //next(error); // Pass error to the next middleware or error handler
  }
};
exports.connectStripeAccount = async (req, res) => {
  const state = req.params.id;

  const redirect_uri = `${process.env.BaseUrl}/api/v1/payment/connect/callback`;

  // Generate the OAuth link URL
  console.log(process.env.STRIPE_CLIENT_ID, "###");
  const authorizeUrl = stripe.oauth.authorizeUrl({
    client_id: process.env.STRIPE_CLIENT_ID,
    scope: "read_write",
    state,
    redirect_uri,
  });

  // Redirect the NGO to the Stripe OAuth authorization page
  // res.json({
  //   authorizeUrl: authorizeUrl,
  // });
  const modifiedAuthorizeUrl = authorizeUrl.replace(
    "/oauth/authorize?",
    "/oauth/authorize/?"
  );
  res.json({ url: modifiedAuthorizeUrl });
};

exports.handleStripeCallback = async (req, res, next) => {
  const { code, state } = req.query;

  try {
    // Exchange the authorization code for an access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    // Extract the connected account ID from the response
    const connectedAccountId = response.stripe_user_id;
    await storeModel.findByIdAndUpdate(state, {
      stripeConnectedAccountId: connectedAccountId,
    });

    const filePath = path.join(
      __dirname,
      "../utils/html/accountconnectionsuccessfull.html"
    );
    res.sendFile(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to connect Stripe account" });
  }
};

// exports.paymentSuccess = async (req, res, next) => {
//   const { orderId, transactionId } = req.query;
//   await orderModel.findByIdAndUpdate(orderId, {
//     paymentInfo: { transactionId, status: "completed", paidAt: Date.now() },
//   });
//   const filePath = path.join(__dirname, "../utils/html/paymentsuccess.html");
//   res.sendFile(filePath);
// };
exports.paymentSuccess = async (req, res, next) => {
  debugger;
  const { orderId, transactionId } = req.query;
  try {
    // Update order payment info
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      {
        paymentInfo: { transactionId, status: "test", paidAt: Date.now() },
      },
      { new: true }
    );

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    // Clear the user's cart if it's an online order
    if (updatedOrder.isOnlineOrder) {
      await cartModel.findOneAndDelete({
        user: updatedOrder.user,
        store: updatedOrder.store,
        status: "active"
      });
    }

    // Send success response
    const filePath = path.join(__dirname, "../utils/html/paymentsuccess.html");
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error in payment success:', error);
    next(error);
  }
};

exports.paymentFailed = async (req, res, next) => {
  const { orderId } = req.query;
  const order = await orderModel.findOne(orderId);
  if (order.isOnlineOrder) {
    await orderModel.findByIdAndDelete(orderId);
  }
  const filePath = path.join(__dirname, "../utils/html/paymentfailed.html");
  res.sendFile(filePath);
};
