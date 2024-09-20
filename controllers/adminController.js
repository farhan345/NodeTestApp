const asyncErrorCatch=require('../middleware/asyncErrorHandlers');
const adminModel = require('../models/admin');
const isObjectPropertyEmpty = require('../utils/checkObjectProperties');
const ErrorHandler = require('../utils/errorHandler');
const sendToken = require('../utils/getJwtToken');
const registerAdmin=asyncErrorCatch(async(req,res,next)=>{
    const {name,email,password}=req.body;
    const oldAdmin=await adminModel.findOne({email});
    if(oldAdmin){
        return next(new ErrorHandler(400,"Admin already register on this email"));
    }
    const admin=await adminModel.create({name,email,password})    
    if(admin){
        res.status(201).json({success:true,message:"Register successfully",admin})
    }
})

const loginAdmin=asyncErrorCatch(async(req,res,next)=>{
    const{email,password}=req.body;
    if(!email||!password){
        return next(new ErrorHandler(400,"please enter your email and password"))
    }
    const admin=await adminModel.findOne({email}).select("+password");
    if(!admin){
        return next(new ErrorHandler(401,"please enter correct email and password"))
    }
    const isPasswordMatched=await admin.comparePassword(password);
    if(!isPasswordMatched){
        return next(new ErrorHandler(401,"please enter correct email and password"))
    }
    const token=await admin.getJWTToken();
    res.status(200).json({success:true,token,admin,message:"Login Successfully"})
})

const logoutAdmin=asyncErrorCatch(async(req,res,next)=>{
    res.clearCookie("token");
    res.status(200).json({success:true,msg:"Admin Logout Successfully"})
})

const updateAdminInfo=asyncErrorCatch(async(req,res,next)=>{
    const user=await adminModel.findById(req.admin._id)
    if(!user){
        return next(new ErrorHandler(400,"Admin Not Found"));
    }
    const updatedData={
        name:req.body.name,
        email:req.body.email,
    }
    const newData = await isObjectPropertyEmpty(updatedData, user)
    const admin=await adminModel.findByIdAndUpdate(req.admin._id,newData);
    if(!admin){
        return next(new ErrorHandler(400,"Admin Not Found"));
    }
     res.status(200).json({success:true,msg:"Record Updated",admin});
})

//when admin wants to update the password can we ask first about previous password?
const updatePassword=asyncErrorCatch(async(req,res,next)=>{
    const{newPassword,confirmNewPassword}=req.body;
    const admin=await adminModel.findById(req.admin._id).select("+password");
    if(!admin){
        return next(new ErrorHandler(400,"Admin Not Found"));
    }
    if(newPassword!==confirmNewPassword){
        return next(new ErrorHandler(400,"password and confirm password does not match"))
    }
    admin.password=newPassword;
    const obj=await admin.save({validateBeforeSave:false});
    if(!obj){
        return next(new ErrorHandler(400,"Password not updated"));
    }
    sendToken(res,200,admin)

})

const verifyAdmin=asyncErrorCatch(async(req,res,next)=>{
    res.status(200).json({success:true})
})

module.exports={registerAdmin,updateAdminInfo,updatePassword,loginAdmin,logoutAdmin,verifyAdmin}