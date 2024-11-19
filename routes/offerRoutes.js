const express=require('express');
const { addProductInOffer, removeProductFromOffer, getAllOfferProducts, getAllStoresThatHaveOffer, getAllOfferProductsByUser, getAllOfferCategories, getAllProductsOFSpecificOfferCategory, createOfferCategoryType, removeCompleteOffer, updateOfferCategoryType} = require('../controllers/offerController');
const router=express.Router();
const {isAuthenticatedStore, isAuthenticatedUser} = require('../middleware/auth');

router.post('/addproduct',isAuthenticatedStore,addProductInOffer); //1createOfferCategoryType
router.post('/create',isAuthenticatedStore,createOfferCategoryType); 
router.put('/update/category',isAuthenticatedStore,updateOfferCategoryType); 

router.delete('/remove',isAuthenticatedStore,removeProductFromOffer); //1

router.delete('/type/remove',isAuthenticatedStore,removeCompleteOffer); //1

router.post('/all',isAuthenticatedStore,getAllOfferProducts)
router.post('/user/product/all',isAuthenticatedUser,getAllOfferProductsByUser)

router.post('/categories/all',isAuthenticatedStore,getAllOfferCategories)
router.post('/category/products',isAuthenticatedStore,getAllProductsOFSpecificOfferCategory)

router.post('/stores/all',isAuthenticatedUser,getAllStoresThatHaveOffer)


// router.delete('/delete/auto',removeOfferAutomaticallyIfExpire)
module.exports=router;