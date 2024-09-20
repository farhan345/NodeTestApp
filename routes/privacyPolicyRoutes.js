const express=require('express');
const {isAuthenticatedAdmin} = require('../middleware/auth');
const { registerprivacyPolicy, updateprivacyPolicyStore, updateprivacyPolicyUser, getSingleprivacyPolicyStoreDetail, getSingleprivacyPolicyUserDetail } = require('../controllers/privacyPolicyController');

const router=express.Router();

router.post('/register',isAuthenticatedAdmin,registerprivacyPolicy);


router.post('/update/store',isAuthenticatedAdmin,updateprivacyPolicyStore)
router.post('/update/user',isAuthenticatedAdmin,updateprivacyPolicyUser)

router.get('/store',isAuthenticatedAdmin,getSingleprivacyPolicyStoreDetail)
router.get('/user',isAuthenticatedAdmin,getSingleprivacyPolicyUserDetail)

module.exports=router;