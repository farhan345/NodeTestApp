const sendToken=async(res,statusCode,user,msg)=>{
    const token=await user.getJWTToken();
    res.status(statusCode).json({success:true,message:msg,token,user})
}

module.exports=sendToken;