const stripe = require('stripe')("sk_test_51NYWGKGjmyRB2WqMhoYUaIErrL26dOGguh9ryDLLMtdEYPxPQICiOKFiG6nTuYyAqIxe8qNExJyd82Qp3TVfFMIH00wM8QnkXU")
const path = require('path')
const storeModel = require('../models/store')
const orderModel = require('../models/order')

exports.createCheckoutSession = async(order, res, next) => {
  const {store, orderItems} = order
  const orderStore = await storeModel.findById(store)
  const plateFormFee = 500

  line_items = []  
  orderItems.forEach(element => {
    line_items.push({price_data:{currency:'usd', product_data:{name: element.productName}, unit_amount: element.price*100}, quantity: element.quantity})
  });

  line_items.push({
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Plateform Fee',
      },
      unit_amount: plateFormFee,
    },
    quantity:1
  },)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    payment_intent_data: {
      application_fee_amount: plateFormFee,
      transfer_data: {
        destination: orderStore.stripeConnectedAccountId,
      },
    },
    mode: 'payment',
    success_url: `${process.env.BaseUrl}/api/v1/payment/payment-success?orderId=${order._id}&transactionId={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BaseUrl}/api/v1/payment/payment-failed?orderId=${order._id}`,
  });


  return res.json({
    status: 'success',
    data: {
      url: session.url
    }
  });


}

exports.connectStripeAccount = async (req, res) => {
  const state = req.params.id;


  const redirect_uri = `${process.env.BaseUrl}/api/v1/payment/connect/callback`
  
  // Generate the OAuth link URL
  console.log(process.env.STRIPE_CLIENT_ID, "###")
  const authorizeUrl = stripe.oauth.authorizeUrl({
    client_id: process.env.STRIPE_CLIENT_ID,
    scope: 'read_write',
    state,
    redirect_uri,
  });

  // Redirect the NGO to the Stripe OAuth authorization page
  // res.json({
  //   authorizeUrl: authorizeUrl,
  // });
  res.redirect(authorizeUrl);
};

exports.handleStripeCallback = async (req, res, next) => {
  const { code, state } = req.query;

  try {
    // Exchange the authorization code for an access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    // Extract the connected account ID from the response
    const connectedAccountId = response.stripe_user_id;
    await storeModel.findByIdAndUpdate(state, {
      stripeConnectedAccountId: connectedAccountId,
    });


   const filePath = path.join(__dirname, '../utils/html/accountconnectionsuccessfull.html');
   res.sendFile(filePath)

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to connect Stripe account' });
  }
};

exports.paymentSuccess = async(req, res, next) => {
  const {orderId, transactionId} = req.query
  await orderModel.findByIdAndUpdate(orderId, {paymentInfo: {transactionId, status: "completed", paidAt: Date.now()}})
  const filePath = path.join(__dirname, '../utils/html/paymentsuccess.html');
  res.sendFile(filePath);
};

exports.paymentFailed = async(req, res, next) => {
  const {orderId} = req.query
  const order = await orderModel.findOne(orderId)
  if(order.isOnlineOrder){
    await orderModel.findByIdAndDelete(orderId)
  }
  const filePath = path.join(__dirname, '../utils/html/paymentfailed.html');
  res.sendFile(filePath);
};