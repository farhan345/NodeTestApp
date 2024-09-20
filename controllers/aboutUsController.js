const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const aboutusModel = require("../models/aboutus");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const ErrorHandler = require("../utils/errorHandler");

exports.registeraboutUs=asyncErrorCatch(async(req,res,next)=>{
    const {description}=req.body
    const faq=aboutusModel.create({description,isStore:true});
    console.log(req.body);
    if(!faq){
        return next(new ErrorHandler(400,"aboutUs not register"))
    }
    res.status(201).json({success:true,msg:"registered"})
})


exports.updateaboutUsStore=asyncErrorCatch(async(req,res,next)=>{
    const aboutUs=await aboutusModel.findOne({isStore:true,isDeleted:false});

   
    if(!aboutUs){
        return next(new ErrorHandler(404,"aboutUs Not Found"))
    }
    const aboutUsData={
        description:req.body.description,
    }
    const newData = await isObjectPropertyEmpty(aboutUsData, aboutUs)
    const updatedaboutUs=await aboutusModel.findByIdAndUpdate(aboutUs?._id, newData, { runValidators: true })
    if(!updatedaboutUs){
        return next(new ErrorHandler(400,"aboutUs not updated"))
    }else{
        res.status(200).json({success:true,msg:"About us updated."})
    }
})
exports.updateaboutUsUser=asyncErrorCatch(async(req,res,next)=>{
    const aboutUs = await aboutusModel.findOne({ isStore: false, isDeleted: false });
    
    
    if(!aboutUs){
        return next(new ErrorHandler(404,"aboutUs Not Found"))
    }
    const aboutUsData={
        description:req.body.description,
    }
    const newData = await isObjectPropertyEmpty(aboutUsData, aboutUs)
    const updatedaboutUs=await aboutusModel.findByIdAndUpdate(aboutUs?._id, newData, { runValidators: true })
    if(!updatedaboutUs){
        return next(new ErrorHandler(400,"aboutUs not updated"))
    }else{
        res.status(200).json({success:true,msg:"aboutUs updated"})
    }
})

exports.getSingleaboutUsStoreDetail=asyncErrorCatch(async(req,res,next)=>{
    const aboutUs=await aboutusModel.findOne({isStore:true,isDeleted:false});
    console.log('about us data is: ', aboutUs)
    if(!aboutUs){
        return next(new ErrorHandler(400,"aboutUs not found"))
    }
   return res.status(200).json({success:true,aboutUs})
})
exports.getSingleaboutUsUserDetail=asyncErrorCatch(async(req,res,next)=>{
    const aboutUs=await aboutusModel.findOne({isStore:false,isDeleted:false});
    if(!aboutUs){
        return next(new ErrorHandler(400,"aboutUs not found"))
    }
   return res.status(200).json({success:true,aboutUs})
})
