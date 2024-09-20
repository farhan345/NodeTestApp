const express=require('express');
const { newOrder, getAllUserOrdersByStoreOwner, getSingleOrderDetailByStoreOwner, getUSerOwnOrders, updateUserOrderStatus, getSingleOrderDetailByUser, getTotalEarnings, getTotalEarningsInstore, getTotalEarningsInOffer, getAllORdersOfSingleStore, getAllOrdersOfSingleStore, getSingleStoreOrderDetail, getAllOrdersOfSingleUser } = require('../controllers/odderController');
const router=express.Router();
const { isAuthenticatedUser, isAuthenticatedStore, isAuthenticatedAdmin} = require('../middleware/auth');


// User Routes
router.post('/new',isAuthenticatedUser,newOrder); //1
router.post('/user/own',isAuthenticatedUser,getUSerOwnOrders)
router.post('/user/own/single/detail',isAuthenticatedUser,getSingleOrderDetailByUser)

// Store Owner Routes
router.put('/update/status',isAuthenticatedStore,updateUserOrderStatus)
router.post('/users/all',isAuthenticatedStore,getAllUserOrdersByStoreOwner)
router.post('/user/single',isAuthenticatedStore,getSingleOrderDetailByStoreOwner)
router.post('/instore/earnings',isAuthenticatedStore,getTotalEarningsInstore)
router.post('/inoffer/earnings',isAuthenticatedStore,getTotalEarningsInOffer)


//admin



router.get("/allstoreorders/:id",isAuthenticatedAdmin,getAllOrdersOfSingleStore)
router.get("/alluserorders/:id",isAuthenticatedAdmin,getAllOrdersOfSingleUser)

router.get("/single/:id",isAuthenticatedAdmin,getSingleStoreOrderDetail)

module.exports=router; 