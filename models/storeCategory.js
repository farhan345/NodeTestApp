const mongoose=require('mongoose');

const storeCategorySchema=new mongoose.Schema({
    storeCategoryType:{
        type:String,
        required:[true,"Please enter store category type"]
    }
})
const storeCategoryModel=mongoose.model('storeCategoryModel',storeCategorySchema);

module.exports=storeCategoryModel;