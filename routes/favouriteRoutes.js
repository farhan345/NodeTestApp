const express=require('express');
const { addToFavourite, getAllFavouriteStores } = require('../controllers/favouriteController');
const router=express.Router();
const { isAuthenticatedUser} = require('../middleware/auth');



router.post('/add',isAuthenticatedUser,addToFavourite); //1
router.post('/all',isAuthenticatedUser,getAllFavouriteStores)

module.exports=router;