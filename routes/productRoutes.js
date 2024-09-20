const express=require('express');
const { addProduct, updateproductInfo, getAllproducts, getAllproductsAvailableInOffer, getSingleProductDetailById, getSingleProductDetailByBarcode, deleteProductByBarcode, deleteProductByID, getAllSearchProducts, getAllproductsByCategory, getAllSearchProductsByStoreThatAreNotInOffer, getAllSearchProductsByNameAndCategory, checkProductsStockAvailable, addProductUsingExcelFile } = require('../controllers/productController');
const router=express.Router();
const { isAuthenticatedStore, isAuthenticatedUser} = require('../middleware/auth');
const { uploadProductImage, uploadExcelFile } = require('../utils/uploadFile');

router.post('/search',isAuthenticatedUser,getAllSearchProducts); //1
router.post('/add',isAuthenticatedStore,uploadProductImage.single('productImage'),addProduct); //1

router.post('/upload/excel',isAuthenticatedStore,uploadExcelFile.single('file'),addProductUsingExcelFile); //1


router.post('/single/id',isAuthenticatedStore,getSingleProductDetailById); //1
router.post('/single/barcode/store',isAuthenticatedStore,getSingleProductDetailByBarcode); //1
router.post('/single/barcode/user',isAuthenticatedUser,getSingleProductDetailByBarcode); //1
router.post('/category/all',isAuthenticatedStore,getAllproductsByCategory); //1

router.post('/update',isAuthenticatedStore,uploadProductImage.single('productImage'),updateproductInfo) //1
router.delete('/delete/id',isAuthenticatedStore,deleteProductByID); //1
router.delete('/delete/barcode',isAuthenticatedStore,deleteProductByBarcode); //1
router.post('/all',isAuthenticatedStore,getAllSearchProductsByNameAndCategory); //


router.post('/offer',isAuthenticatedStore,getAllproductsAvailableInOffer); //1

router.post('/not/offer/all',isAuthenticatedStore,getAllSearchProductsByStoreThatAreNotInOffer); //1
router.post('/check/available/stock',isAuthenticatedUser,checkProductsStockAvailable); //1


module.exports=router;