const mongoose=require('mongoose');

const aboutusSchema=new mongoose.Schema({
   
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
const aboutusModel=mongoose.model('aboutusModel',aboutusSchema);

module.exports=aboutusModel;