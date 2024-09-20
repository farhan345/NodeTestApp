const express=require('express');
const { addorderStatus, getAllorderStatusType } = require('../controllers/orderStatusController');
const router=express.Router();

router.post('/add',addorderStatus); //1
router.get('/all',getAllorderStatusType); //1

module.exports=router;