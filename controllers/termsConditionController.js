const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const termsConditionModel = require("../models/termsCondition");
// const termsConditionModel = require("../models/termsCondition");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const ErrorHandler = require("../utils/errorHandler");

exports.registertermsCondition=asyncErrorCatch(async(req,res,next)=>{
    const {description}=req.body
    const faq=termsConditionModel.create({description,isStore:true});
    console.log(req.body);
    if(!faq){
        return next(new ErrorHandler(400,"termsCondition not register"))
    }
    res.status(201).json({success:true,msg:"registered"})
})


exports.updatetermsConditionStore=asyncErrorCatch(async(req,res,next)=>{
    const termsCondition=await termsConditionModel.findOne({isStore:true,isDeleted:false});
    if(!termsCondition){
        return next(new ErrorHandler(404,"termsCondition Not Found"))
    }
    const termsConditionData={
        description:req.body.description,
    }
    const newData = await isObjectPropertyEmpty(termsConditionData, termsCondition)
    const updatedtermsCondition=await termsConditionModel.findByIdAndUpdate(termsCondition?._id, newData, { runValidators: true })
    if(!updatedtermsCondition){
        return next(new ErrorHandler(400,"termsCondition not updated"))
    }else{
        res.status(200).json({success:true,msg:"Terms and Conditions updated."})
    }
})
exports.updatetermsConditionUser=asyncErrorCatch(async(req,res,next)=>{
    const termsCondition=await termsConditionModel.findOne({isStore:false,isDeleted:false});
    if(!termsCondition){
        return next(new ErrorHandler(404,"termsCondition Not Found"))
    }
    const termsConditionData={
        description:req.body.description,
    }
    const newData = await isObjectPropertyEmpty(termsConditionData, termsCondition)
    const updatedtermsCondition=await termsConditionModel.findByIdAndUpdate(termsCondition?._id, newData, { runValidators: true })
    if(!updatedtermsCondition){
        return next(new ErrorHandler(400,"termsCondition not updated"))
    }else{
        res.status(200).json({success:true,msg:"Terms and Conditions updated."})
    }
})

exports.getSingletermsConditionStoreDetail=asyncErrorCatch(async(req,res,next)=>{
    const termsCondition=await termsConditionModel.findOne({isStore:true,isDeleted:false});
    if(!termsCondition){
        return next(new ErrorHandler(400,"termsCondition not found"))
    }
   return res.status(200).json({success:true,termsCondition})
})
exports.getSingletermsConditionUserDetail=asyncErrorCatch(async(req,res,next)=>{
    const termsCondition=await termsConditionModel.findOne({isStore:false,isDeleted:false});
    if(!termsCondition){
        return next(new ErrorHandler(400,"termsCondition not found"))
    }
   return res.status(200).json({success:true,termsCondition})
})
