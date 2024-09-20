const express=require('express');
const { addStoreCategory, getAllStoreCategoryType } = require('../controllers/storeCategoryController');
const router=express.Router();

router.post('/add',addStoreCategory); //1
router.get('/all',getAllStoreCategoryType); //1

module.exports=router;