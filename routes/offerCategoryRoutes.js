const express=require('express');
const { addofferCategory, getAlloffersCategory } = require('../controllers/offerCategoryController');
const router=express.Router();
const { isAuthenticatedStore} = require('../middleware/auth');

router.post('/add',isAuthenticatedStore,addofferCategory); //1
router.post('/all',isAuthenticatedStore,getAlloffersCategory); //1

module.exports=router;