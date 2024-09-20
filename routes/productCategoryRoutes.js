const express=require('express');
const { addProductCategory, getAllproductsCategory, updateProductCategoryr, deleteProductCategory } = require('../controllers/productCategoryController');
const router=express.Router();
const { isAuthenticatedStore, isAuthenticatedUser} = require('../middleware/auth');

router.post('/add',isAuthenticatedStore,addProductCategory); //1
router.post('/types',isAuthenticatedStore,getAllproductsCategory); //1
router.post('/types/user',isAuthenticatedUser,getAllproductsCategory); //1

router.put('/:id',isAuthenticatedStore,updateProductCategoryr); //1
router.delete('/:id',isAuthenticatedStore,deleteProductCategory); //1
module.exports=router;