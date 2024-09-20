const asyncErrorCatch = require('../middleware/asyncErrorHandlers');
const ErrorHandler = require("../utils/errorHandler");
const fs = require('fs')
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const offerCategoryModel = require("../models/offerCategory");

exports.addofferCategory = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.offerCategoryType) {
        return next(new ErrorHandler(400, "Please enter offer category type"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store id"))
    }
    const category=await offerCategoryModel.findOne({offerCategoryType:req.body.offerCategoryType,store:req.body.store})
    if(category){
        return next(new ErrorHandler(400,"category already added"))
    }
    const Data = {
        offerCategoryType: req.body.offerCategoryType,
        store:req.body.store
    }
    offerCategoryModel.create(Data, async (err, result) => {
        if (err) {
            return next(new ErrorHandler(400, err.message));
        }
        else {
            res.status(200).json({success:true,message:"offer category addedd successfully"})
        }
    });
})
exports.getAlloffersCategory = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store id"))
    }
    const category = await offerCategoryModel.find({store:req.body.store});;
    if (!category) {
        return next(new ErrorHandler(400, "No category Found"));
    }
    res.status(200).json({ success: true, category,message:"Offer categories retrieved successfully" })
})