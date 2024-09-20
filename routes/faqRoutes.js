const express=require('express');
const {registerFaqs,  getSingleFaqsDetail, deletefaqs, updatefaqs, getAllStoreFaqs, getAllUserFaqs } = require('../controllers/faqController');
const {isAuthenticatedAdmin} = require('../middleware/auth');

const router=express.Router();

router.post('/register',isAuthenticatedAdmin,registerFaqs);
router.get('/store',isAuthenticatedAdmin,getAllStoreFaqs)
router.get('/user',isAuthenticatedAdmin,getAllUserFaqs)

router.put('/:id',isAuthenticatedAdmin,updatefaqs)
router.get('/:id',isAuthenticatedAdmin,getSingleFaqsDetail)
router.delete('/:id',isAuthenticatedAdmin,deletefaqs)
module.exports=router;