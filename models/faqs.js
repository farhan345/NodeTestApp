const mongoose=require('mongoose');

const faqSchema=new mongoose.Schema({
    title:{
        type:String,
        required:[true,"Please enter title"]
    },
    description:{
        type:String,
        required:[true,"Please enter description"]
    },
    isStoreFaq:{
        type:Boolean,
        required:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
})
const faqModel=mongoose.model('faqModel',faqSchema);

module.exports=faqModel;