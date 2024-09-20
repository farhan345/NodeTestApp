const express=require('express');
const { addToCart, removeItemFromCart, getAllProductsThatHaveInCart, addIncrementInProductQuantity, addDecrementInProductQuantity, removeItemFromCartByUser, removeCompleteItemFromCartByUser } = require('../controllers/cartController');
const router=express.Router();
const { isAuthenticatedUser, isAuthenticatedStore} = require('../middleware/auth');

router.post('/add',isAuthenticatedUser,addToCart); //1
router.delete('/delete',removeItemFromCart)
router.delete('/delete/user',isAuthenticatedUser,removeItemFromCartByUser)
router.delete('/delete/complete/:id',isAuthenticatedUser,removeCompleteItemFromCartByUser)

router.post('/all',isAuthenticatedUser,getAllProductsThatHaveInCart)
router.post('/inc',isAuthenticatedUser,addIncrementInProductQuantity)
router.post('/dec',isAuthenticatedUser,addDecrementInProductQuantity)
// router.get('/user/own/single/detail',isAuthenticatedUser,getSingleOrderDetailByUser)

// // Store Owner Routes
// router.put('/update/status',isAuthenticatedStore,updateUserOrderStatus)

// router.get('/user/single',isAuthenticatedStore,getSingleOrderDetailByStoreOwner)

module.exports=router;    