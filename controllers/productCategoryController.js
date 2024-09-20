const asyncErrorCatch = require('../middleware/asyncErrorHandlers');
const ErrorHandler = require("../utils/errorHandler");
const fs = require('fs')
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const productCategoryModel = require("../models/productCategory");
const productModel = require('../models/product');

exports.addProductCategory = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.categoryName) {
        return next(new ErrorHandler(400, "Please enter product category name"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store id"))
    }
    // const existingCategory=await productCategoryModel.findOne({categoryName:req.body.name,isDeleted:false})
    // if(existingCategory){
    //     return next(new ErrorHandler(400, "Category already exist with this name"))
    // }
    const category = await productCategoryModel.findOne({ categoryName: req.body.categoryName, store: req.body.store, isDeleted: false })
    if (category) {
        return next(new ErrorHandler(400, "category already added"))
    }
    const Data = {
        categoryName: req.body.categoryName,
        store: req.body.store
    }
    productCategoryModel.create(Data, async (err, result) => {
        if (err) {
            return next(new ErrorHandler(400, err.message));
        }
        else {
            res.status(200).json({ success: true, message: "product category addedd successfully" })
        }
    });
})
exports.getAllproductsCategory = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store id"))
    }
    const category = await productCategoryModel.find({ store: req.body.store, isDeleted: false });
    if (!category) {
        return next(new ErrorHandler(400, "No category Found"));
    } else {
        res.status(200).json({ success: true, category, message: "Products category retrieved successfully" })
    }

})

exports.deleteProductCategory = asyncErrorCatch(async (req, res, next) => {
    const productCategoryr = await productCategoryModel.findOne({ _id: req?.params?.id, isDeleted: false });
    if (!productCategoryr) {
        return next(new ErrorHandler(404, "productCategory Not Found"))
    }
    const productCategory = await productCategoryModel.findByIdAndUpdate({ _id: req.params.id }, { $set: { isDeleted: true } });
    if (productCategory) {
        productModel.updateMany({ category: req.params.id }, { $set: { isDeleted: true } }, (err, result) => {
            if (err) {
                return next(new ErrorHandler(400, err.message))
            } else {
                console.log(result);
                res.status(200).json({ success: true, message: "productCategory removed" })
            }

        });

    } else {
        return next(new ErrorHandler(404, "productCategory not found"))
    }

});

exports.updateProductCategoryr = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "please enter store Id"))
    }
    const productCategory = await productCategoryModel.findOne({ _id: req?.params?.id, isDeleted: false });
    if (!productCategory) {
        return next(new ErrorHandler(404, "productCategory Not Found"))
    }
    if (req.body.categoryName) {
        const category = await productCategoryModel.findOne({ categoryName: req.body.categoryName, store: req.body.store, isDeleted: false })
        if (category) {
            return next(new ErrorHandler(400, "category already exist"))
        }
    }
    const productCategoryData = {
        categoryName: req.body.categoryName,
    }

    const newData = await isObjectPropertyEmpty(productCategoryData, productCategory)

    const updatedproductCategory = await productCategoryModel.findByIdAndUpdate(req.params.id, newData, { runValidators: true })
    if (!updatedproductCategory) {
        return next(new ErrorHandler(400, "productCategory not updated"))
    } else {

        res.status(200).json({ success: true, message: "productCategory updated" })
    }
})