const express=require('express');
const { employeeRegister, employeeLogin, forgotPassword, resetPassword, verifyResetPasswordOTP, getEmployeeOwnProfile, getAllEmployeesByStoreOwner, getSingleEmployeeDetail, updateEmployeeInfoByStoreOwner, addForgotPasswordEmail, verifyEmployeeEmailVerificationOTP, updateEmployeeOwnPassword, deleteEmployee } = require('../controllers/employeeController');
const router=express.Router();
const {isAuthenticatedAdmin,authorizedRoles, isAuthenticatedUser,authorizedStatus, isAuthenticatedEmployee, isAuthenticatedStore} = require('../middleware/auth');
const { uploadUserProfileImage, uploadUserDocumentImage } = require('../utils/uploadFile');



router.post('/register',isAuthenticatedStore,employeeRegister); //1
router.post('/login',employeeLogin); //1


router.post('/add/forgotemail',addForgotPasswordEmail); //1
router.post('/forgotemail/verify',verifyEmployeeEmailVerificationOTP); //1

router.post('/password/forgot',forgotPassword);
router.post('/password/verify/otp',verifyResetPasswordOTP); //1
router.put('/password/reset',resetPassword);


router.post('/me',isAuthenticatedEmployee,getEmployeeOwnProfile); //1
router.put('/update/password',isAuthenticatedEmployee,updateEmployeeOwnPassword); //1


//Store Owner routes 
router.delete('/store/delete',isAuthenticatedStore,deleteEmployee);

router.post('/store/employees',isAuthenticatedStore,getAllEmployeesByStoreOwner);
router.post('/store/employee',isAuthenticatedStore,getSingleEmployeeDetail);
router.put('/store/employee/update',isAuthenticatedStore,updateEmployeeInfoByStoreOwner);


module.exports=router; 