const mongoose=require('mongoose');

const privacyPolicySchema=new mongoose.Schema({
   
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
const privacyPolicyModel=mongoose.model('privacyPolicyModel',privacyPolicySchema);

module.exports=privacyPolicyModel;