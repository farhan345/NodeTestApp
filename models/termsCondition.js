const mongoose=require('mongoose');

const termsConditionSchema=new mongoose.Schema({
   
    description:{
        type:String,
       default:""
    },
    isStore:{
        type:Boolean,
        required:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
})
const termsConditionModel=mongoose.model('termsConditionModel',termsConditionSchema);

module.exports=termsConditionModel;