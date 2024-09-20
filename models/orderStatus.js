const mongoose=require('mongoose');

const orderStatusSchema=new mongoose.Schema({
    statusType:{
        type:String,
        required:[true,"Please enter status type"]
    }
})
const orderStatusModel=mongoose.model('orderStatusModel',orderStatusSchema);

module.exports=orderStatusModel;