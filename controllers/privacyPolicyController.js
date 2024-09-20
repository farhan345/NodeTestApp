const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const privacyPolicyModel = require("../models/privacyPolicy");
// const privacyPolicyModel = require("../models/privacyPolicy");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const ErrorHandler = require("../utils/errorHandler");

exports.registerprivacyPolicy=asyncErrorCatch(async(req,res,next)=>{
    const {description}=req.body
    const faq=privacyPolicyModel.create({description,isStore:true});
    console.log(req.body);
    if(!faq){
        return next(new ErrorHandler(400,"privacyPolicy not register"))
    }
    res.status(201).json({success:true,msg:"registered"})
})


exports.updateprivacyPolicyStore=asyncErrorCatch(async(req,res,next)=>{
    const privacyPolicy=await privacyPolicyModel.findOne({isStore:true,isDeleted:false});
    if(!privacyPolicy){
        return next(new ErrorHandler(404,"privacyPolicy Not Found"))
    }
    const privacyPolicyData={
        description:req.body.description,
    }
    const newData = await isObjectPropertyEmpty(privacyPolicyData, privacyPolicy)
    const updatedprivacyPolicy=await privacyPolicyModel.findByIdAndUpdate(privacyPolicy?._id, newData, { runValidators: true })
    if(!updatedprivacyPolicy){
        return next(new ErrorHandler(400,"privacyPolicy not updated"))
    }else{
        res.status(200).json({success:true,msg:"privacyPolicy updated"})
    }
})
exports.updateprivacyPolicyUser=asyncErrorCatch(async(req,res,next)=>{
    const privacyPolicy=await privacyPolicyModel.findOne({isStore:false,isDeleted:false});
    if(!privacyPolicy){
        return next(new ErrorHandler(404,"privacyPolicy Not Found"))
    }
    const privacyPolicyData={
        description:req.body.description,
    }
    const newData = await isObjectPropertyEmpty(privacyPolicyData, privacyPolicy)
    const updatedprivacyPolicy=await privacyPolicyModel.findByIdAndUpdate(privacyPolicy?._id, newData, { runValidators: true })
    if(!updatedprivacyPolicy){
        return next(new ErrorHandler(400,"privacyPolicy not updated"))
    }else{
        res.status(200).json({success:true,msg:"privacyPolicy updated"})
    }
})

exports.getSingleprivacyPolicyStoreDetail=asyncErrorCatch(async(req,res,next)=>{
    const privacyPolicy=await privacyPolicyModel.findOne({isStore:true,isDeleted:false});
    if(!privacyPolicy){
        return next(new ErrorHandler(400,"privacyPolicy not found"))
    }
   return res.status(200).json({success:true,privacyPolicy})
})
exports.getSingleprivacyPolicyUserDetail=asyncErrorCatch(async(req,res,next)=>{
    const privacyPolicy=await privacyPolicyModel.findOne({isStore:false,isDeleted:false});
    if(!privacyPolicy){
        return next(new ErrorHandler(400,"privacyPolicy not found"))
    }
   return res.status(200).json({success:true,privacyPolicy})
})
