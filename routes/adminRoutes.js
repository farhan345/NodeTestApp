const express=require('express');
const { registerAdmin, loginAdmin, logoutAdmin, updateAdmin, updatePassword, updateAdminInfo, verifyAdmin } = require('../controllers/adminController');
const { isAuthenticatedAdmin, authorizedStatus } = require('../middleware/auth');
const router=express.Router();

router.post('/register',registerAdmin);
router.post('/login',loginAdmin);
router.post('/logout',logoutAdmin);

router.put('/update/password',isAuthenticatedAdmin,updatePassword);
router.put('/update/info',isAuthenticatedAdmin,updateAdminInfo);

router.get('/verify',isAuthenticatedAdmin,verifyAdmin)
module.exports=router;