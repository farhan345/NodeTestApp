const mongoose=require('mongoose');

const offerCategorySchema=new mongoose.Schema({
    offerCategoryType:{
        type:String,
        required:[true,"please enter offer category type"]
    },
    store:{
        type:mongoose.Schema.ObjectId,
        ref:"storeModel",
        required:[true,"please enter store Id"]
    }
})


const offerCategoryModel=mongoose.model('offerCategoryModel',offerCategorySchema);

module.exports=offerCategoryModel;