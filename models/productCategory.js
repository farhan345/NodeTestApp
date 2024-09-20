const mongoose=require('mongoose');

const productCategorySchema=new mongoose.Schema({
    categoryName:{
        type:String,
        required:[true,"Please enter product category"]
    },
    store:{
        type:mongoose.Schema.ObjectId,
        ref:"storeModel",
        required:[true,"please enter store Id"]
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
})


const productCategoryModel=mongoose.model('productCategoryModel',productCategorySchema);

module.exports=productCategoryModel;