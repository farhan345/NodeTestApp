const jwt = require("jsonwebtoken");
const adminModel = require("../models/admin");
const employeeModel = require("../models/employee");
const storeModel = require("../models/store");
const userModel = require("../models/user");
const atob = require("../utils/atob");
const ErrorHandler = require("../utils/errorHandler");
const asyncErrorCatch = require("./asyncErrorHandlers");

const isAuthenticatedUser=asyncErrorCatch(async(req,res,next)=>{
    const token = req.headers['x-access-token'];
    if(!token){
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    const expiry=(JSON.parse(atob(token.split('.')[1]))).exp;
    if(Math.floor((new Date).getTime()/1000)>=expiry){
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    // token verification
    const decodedData=await jwt.verify(token,process.env.JWT_SECRET_KEY);
    const user=await userModel.findById(decodedData.id);
    if(!user){
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    next();
})
const isAuthenticatedToken=asyncErrorCatch(async(req,res,next)=>{
    const token = req.headers['x-access-token'];
    if(!token){
        return next(new ErrorHandler(401,"token expired"));
    }
    const expiry=(JSON.parse(atob(token.split('.')[1]))).exp;
    if(Math.floor((new Date).getTime()/1000)>=expiry){
        return next(new ErrorHandler(401,"token expired"));
    }
    // token verification
    const decodedData=await jwt.verify(token,process.env.JWT_SECRET_KEY);
    const user=await userModel.findById(decodedData.id);
    if(!user){
        return next(new ErrorHandler(401,"token expired"));
    }
    next();
})

const isAuthenticatedStore=asyncErrorCatch(async(req,res,next)=>{
    const token = req.headers['x-access-token'];
  
    if (!token) {
        return next(new ErrorHandler(401, "Your session has expired due to inactivity"));
    }

    const expiry = (JSON.parse(atob(token.split('.')[1]))).exp;
    if (Math.floor((new Date).getTime() / 1000) >= expiry) {
        return next(new ErrorHandler(401, "Your session has expired due to inactivity"));
    }

    // Token verification
    let decodedData;
    try {
        decodedData = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
        return next(new ErrorHandler(401, "Invalid token"));
    }

    const store = await storeModel.findById(decodedData.id);
    const employee = await employeeModel.findById(decodedData.id);

    if (!store && !employee) {
        return next(new ErrorHandler(401, "Your session has expired due to inactivity"));
    }

    next();
})
// const isAuthenticatedStoreOrUser=(req, res, next)=> {
//     if (req.isAuthenticatedStore() || req.isAuthenticatedUser()) {
//       return next();
//     } else {
//       // If neither middleware function passes, send an appropriate response
//       res.status(401).json({ success: false, message: 'Unauthorized access' });
//     }
//   }
  

  
const isAuthenticatedEmployee=asyncErrorCatch(async(req,res,next)=>{
    const token = req.headers['x-access-token'];
    if(!token){
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    const expiry=(JSON.parse(atob(token.split('.')[1]))).exp;
    if(Math.floor((new Date).getTime()/1000)>=expiry){
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    // token verification
    const decodedData=await jwt.verify(token,process.env.JWT_SECRET_KEY);
    const employee=await employeeModel.findById(decodedData.id);
    if(!employee){
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    next();
})
const isAuthenticatedAdmin=asyncErrorCatch(async(req,res,next)=>{
    console.log("Dsds");
    const bearerHeader = req.headers['authorization'];
    if(!bearerHeader){
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    const bearer=bearerHeader.split(' ')
    const token=bearer[1]
   
    if(!token){
        console.log("Dsds2");
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    console.log("Dsds34",token);
    const expiry=(JSON.parse(atob(token.split('.')[1]))).exp;
    if(Math.floor((new Date).getTime()/1000)>=expiry){
        console.log("insode");
        return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
    }
    console.log("out");
    //verify token if it verify then it return an id 
    const decodedData=await jwt.verify(token,process.env.JWT_SECRET_KEY)
console.log("decoded",decodedData);
    const admin=await adminModel.findById(decodedData.id);
    if(!admin){
       return next(new ErrorHandler(401,"Your session has expired due to inactivity"))
    }
    console.log(admin,"admin");
    req.admin=admin;
     
    next();
    
//     const bearerHeader = req.headers['authorization'];
//     if(!bearerHeader){
//         return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
//     }
//     const bearer=bearerHeader.split(' ')
//     const token=bearer[1]
//    console.log("token",token);
//     if(token===null){
//         console.log("token3w",token);
//         return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
//     }
//     console.log("token3",token);
//     const expiry=(JSON.parse(atob(token.split('.')[1]))).exp;
//     if(Math.floor((new Date).getTime()/1000)>=expiry){
//         return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
//     }
//     //verify token if it verify then it return an id 
//     const decodedData=await jwt.verify(token,process.env.JWT_SECRET_KEY)
//     const admin=await adminModel.findById(decodedData.id);
//     if(!admin){
//        return next(new ErrorHandler(401,"Your session has expired due to inactivity"))
//     }
//     req.admin=admin;
    
    // next();
})

const authorizedStatus=(req,res,next)=>{
    if(!req.admin.isActive){
        return next(new ErrorHandler(400,"You don't have rights to access this"));
    }
    next();
}
const authorizedRoles=(req,res,next)=>{
    if(req.admin.role!=="admin"){
         return next(new ErrorHandler(400,"only admin has to access this resource"));
    }
    next();
}


// backup for store auth
// const token = req.headers['x-access-token'];
  
//     if(!token){
//         return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
//     }
//     const expiry=(JSON.parse(atob(token.split('.')[1]))).exp;
//     if(Math.floor((new Date).getTime()/1000)>=expiry){
//         return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
//     }
//     // token verification
//     const decodedData=await jwt.verify(token,process.env.JWT_SECRET_KEY);
//     const store=await storeModel.findById(decodedData.id);
//     if(!store){
//         return next(new ErrorHandler(401,"Your session has expired due to inactivity"));
//     }
//     next();
// backup for store auth



module.exports={isAuthenticatedUser,isAuthenticatedToken,authorizedRoles,isAuthenticatedEmployee,isAuthenticatedAdmin,isAuthenticatedStore,authorizedStatus};