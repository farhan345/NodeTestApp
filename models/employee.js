const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken')
const validator=require("validator")
const crypto=require("crypto")

const employeeSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"please enter employee name"]
    },
    email:{
        type:String,
        required:[true,"please enter your email"],
        unique:true,
        validate:[validator.isEmail,"please enter correct email"]
    },
    emailForForgotPassword:{
        type:String,
        default:""
    },
    isEmailForgotPasswordVerified:{
        type:Boolean,
        default:false
    },
    type:{
        type:String,
        required:[true,"please select employee type"],
    },
    status:{
        type:String,
        default:"active"
    },
    password:{
        type:String,
        required:[true,"please enter your password"],
        minLength:[8,"password should be greater than 8 characters"],
        select:false,
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    store:{
        type:mongoose.Schema.ObjectId,
        ref:"storeModel",
        required:[true,"Please provide store Id"]
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    emailverifyOTP: String,
    resetPasswordOTP: String,
    resetPasswordExpire: Date,
    emailVerifyOTPExpire: Date
})

//this method will be called before saving schema

// employeeSchema.pre('find', function() {
//     this.where({ isDeleted: false });
//   });
  
//   employeeSchema.pre('findOne', function() {
//     this.where({ isDeleted: false });
//   });
//   employeeSchema.pre('findById', function() {
//     this.where({ isDeleted: false });
//   });

employeeSchema.pre('save',async function(next){
    if(!this.isModified("password")){
        return next();
    }
    this.password=await bcrypt.hash(this.password,12)
})

// employeeSchema.pre(/^find/, function (next) {
//     this.populate({
//       path: 'store',
//       select: '-isDeleted',
//       match: { isDeleted: false },
//     });
//     next();
//   });
//get JWT Token

employeeSchema.methods.getJWTToken=async function(){
    return jwt.sign({id:this._id},process.env.JWT_SECRET_KEY,{expiresIn:process.env.JWT_EXPIRE})
}

//compare password

employeeSchema.methods.comparePassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password)
}

//get reset password opt
employeeSchema.methods.getResetPasswordOPT=function(){
    const resetPasswordOTP=`${Math.floor(100000+Math.random()*900000)}`;
    this.resetPasswordOTP=crypto.createHash("sha256").update(resetPasswordOTP).digest('hex');
    this.resetPasswordExpire=new Date(Date.now()+10*60*1000)
    return resetPasswordOTP;
}

//get email verification otp
employeeSchema.methods.getEmailVerificationOPT = function () {
    const emailverifyOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
    this.emailverifyOTP = crypto.createHash("sha256").update(emailverifyOTP).digest('hex');
    this.emailVerifyOTPExpire = new Date(Date.now() + 10 * 60 * 1000)
    return emailverifyOTP;
}

const employeeModel=mongoose.model('employeeModel',employeeSchema);

module.exports=employeeModel;