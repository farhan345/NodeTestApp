const asyncErrorCatch = require('../middleware/asyncErrorHandlers');
const storeCategoryModel = require('../models/storeCategory');
const ErrorHandler = require("../utils/errorHandler");

exports.addStoreCategory = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.storeCategoryType) {
        return next(new ErrorHandler(400, "Please enter store category type"))
    }
    const storeCategory=await storeCategoryModel.findOne({storeCategoryType:req.body.storeCategoryType})
    if(storeCategory){
        return next(new ErrorHandler(400,"Store category type already added"))
    }
    const Data = {
        storeCategoryType: req.body.storeCategoryType,
    }
    storeCategoryModel.create(Data, async (err, result) => {
        if (err) {
            return next(new ErrorHandler(400, err.message));
        }
        else {
            res.status(200).json({success:true,message:"Store category type addedd successfully"})
        }
    });
})
exports.getAllStoreCategoryType = asyncErrorCatch(async (req, res, next) => {
    const storeCategory=await storeCategoryModel.find()
    if(storeCategory){
        res.status(200).json({ success: true, storeCategory, message:"store categories retrieved successfully" })
    }
})