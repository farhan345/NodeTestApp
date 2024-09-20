const asyncErrorCatch = require('../middleware/asyncErrorHandlers');
const ErrorHandler = require("../utils/errorHandler");
const orderStatusModel = require('../models/orderStatus');

exports.addorderStatus = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.orderStatusType) {
        return next(new ErrorHandler(400, "Please enter order status type"))
    }
    const status=await orderStatusModel.findOne({statusType:req.body.orderStatusType})
    if(status){
        return next(new ErrorHandler(400,"order status type already added"))
    }
    const Data = {
        statusType: req.body.orderStatusType,
    }
    orderStatusModel.create(Data, async (err, result) => {
        if (err) {
            return next(new ErrorHandler(400, err.message));
        }
        else {
            res.status(200).json({success:true,message:"order status type addedd successfully"})
        }
    });
})
exports.getAllorderStatusType = asyncErrorCatch(async (req, res, next) => {
    const status=await orderStatusModel.find()
    if(status){
        res.status(200).json({ success: true, status })
    }
})