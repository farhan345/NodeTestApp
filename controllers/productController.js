const asyncErrorCatch = require('../middleware/asyncErrorHandlers');
const ErrorHandler = require("../utils/errorHandler");
const fs = require('fs')
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const productModel = require("../models/product");
const multer = require('multer');
const xlsx = require('xlsx');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const mongoURI = 'mongodb+srv://skipaline:skipaline123@estoredb.ulxrvel.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'test';
const collectionName = 'productmodels';
const path = require('path');
const moment = require('moment');
const exceljs = require('exceljs');
const productCategoryModel = require('../models/productCategory');
// const { io } = require('../server'); // Replace './server' with the correct path to your server.js file

exports.addProduct = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.productName) {
        return next(new ErrorHandler(400, "Please enter product name"))
    }
    if (!req.body.price) {
        return next(new ErrorHandler(400, "Please enter product price"))
    }
    if (!req.body.quantity) {
        return next(new ErrorHandler(400, "Please enter product quantity"))
    }
    if (!req.body.category) {
        return next(new ErrorHandler(400, "Please select product category"))
    }
    if (!req.body.productBarcode) {
        return next(new ErrorHandler(400, "Please enter product barcode"))
    }
    if (!req.body.productLocation) {
        return next(new ErrorHandler(400, "Please enter product location"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    if (!req.file?.path) {
        return next(new ErrorHandler(400, "Please select your product picture"))
    }
    const oldProduct = await productModel.find({ store: req.body.store, productBarcode: req.body.productBarcode, isDeleted: false });
    if (oldProduct.length !== 0) {
        fs.unlinkSync(req.file.path);
        return next(new ErrorHandler(400, "Product with this barcode already addedd in the store"))
    }
    console.log(req?.body);
    console.log(req.file);
    const Data = {
        productName: req.body.productName,
        price: req.body.price,
        quantity: req.body.quantity,
        category: req.body.category,
        productBarcode: req.body.productBarcode,
        productLocation: req.body.productLocation,
        store: req.body.store,
        image: req.file.path,
    }
    productModel.create(Data, async (err, result) => {
        if (err) {
            fs.unlinkSync(req.file?.path);
            return next(new ErrorHandler(400, err.message));
        }

        res.status(200).json({ success: true, message: "product addedd successfully", result })

    });
})

exports.getSingleProductDetailById = asyncErrorCatch(async (req, res, next) => {
    if (!req.body._id) {
        return next(new ErrorHandler(400, "Please enter product Id"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const product = await productModel.findOne({ _id: req.body._id, store: req.body.store, isDeleted: false }).populate("category", "categoryName");
    if (!product) {
        return next(new ErrorHandler(401, "product not found"))
    }
    res.status(200).json({ success: true, product, message: "product detail retrieved successfully" })
})

exports.getSingleProductDetailByBarcode = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.productBarcode) {
        return next(new ErrorHandler(400, "Please enter product barcode"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const product = await productModel.findOne({ productBarcode: req.body.productBarcode, store: req.body.store, isDeleted: false }).populate("category", "categoryName");
    if (!product) {
        return next(new ErrorHandler(401, "product not found"))
    }
    res.status(200).json({ success: true, product, message: "product detail retrieved successfully" })
})

exports.updateproductInfo = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.productName) {
        return next(new ErrorHandler(400, "Please enter product name"))
    }
    if (!req.body.price) {
        return next(new ErrorHandler(400, "Please enter product price"))
    }
    if (!req.body.quantity) {
        return next(new ErrorHandler(400, "Please enter product quantity"))
    }
    if (!req.body.category) {
        return next(new ErrorHandler(400, "Please select product category"))
    }
    if (!req.body.productLocation) {
        return next(new ErrorHandler(400, "Please select product location"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const product = await productModel.findOne({ _id: req.body._id, store: req.body.store, isDeleted: false });
    if (!product) {
        return next(new ErrorHandler(400, "product not found"))
    }
    const Data = {
        productName: req.body.productName,
        price: req.body.price,
        quantity: req.body.quantity,
        productLocation: req.body.productLocation,
        category: req.body.category,
        image: req.file ? req.file?.path : "",
    }
    const newData = await isObjectPropertyEmpty(Data, product)
    productModel.findByIdAndUpdate(req.body._id, newData, { runValidators: true }, async (err, result) => {
        if (err) {
            if (req?.file?.path) {
                fs.unlinkSync(req?.file?.path);
            }
            return next(new ErrorHandler(400, err.message))
        }
        else {
            if (req?.file?.path) {
                fs.unlinkSync(result?.image);
            }
            const product = await productModel.findById(req.body._id);
            res.status(200).json({ success: true, msg: "product updated", product })
        }
    });

})

exports.deleteProductByID = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    if (req.body?.deletedProducts?.length === 0) {
        return next(new ErrorHandler(400, "Please select product that you want to be deleted"))
    }

    const deletedProducts = req.body.deletedProducts.map((obj) => { return obj.product })
    console.log(deletedProducts);
    productModel.updateMany(
        { _id: { $in: deletedProducts } },
        { $set: { isDeleted: true } },
        (err, result) => {
            if (err) {
                return next(new ErrorHandler(400, err.message))
            }
            res.status(200).json({ success: true, message: "product removed" })
        }
    );


    // const product = await productModel.findOne({_id:req.body._id,store:req.body.store});
    // if (!product) {
    //     return next(new ErrorHandler(401, "product not found"))
    // }
    // productModel.findByIdAndDelete(req.body._id,(err,result)=>{
    //     if(err){
    //         return next(new ErrorHandler(400,err.message))
    //     }
    //     fs.unlinkSync(result.image);
    //     res.status(200).json({ success: true, message:"product deleted" })
    // })
})
exports.deleteProductByBarcode = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.productBarcode) {
        return next(new ErrorHandler(400, "Please enter product Barcode"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const product = await productModel.findOne({ productBarcode: req.body.productBarcode, store: req.body.store, isDeleted: false });
    if (!product) {
        return next(new ErrorHandler(401, "product not found"))
    }
    productModel.findByIdAndDelete(req.body._id, (err, result) => {
        if (err) {
            return next(new ErrorHandler(400, err.message))
        }
        fs.unlinkSync(result.image);
        res.status(200).json({ success: true, message: "product deleted" })
    })

})
exports.getAllproducts = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const products = await productModel.find({ store: req.body.store, isDeleted: false }).populate({ path: "category", select: "categoryName" });;
    if (!products) {
        return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
})

exports.getAllproductsByCategory = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    if (!req.body.category) {
        return next(new ErrorHandler(400, "Please enter category Id"))
    }
    const products = await productModel.find({ store: req.body.store, category: req.body.category, isDeleted: false }).populate({ path: "category", select: "categoryName" });;
    if (!products) {
        return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
})

exports.getAllproductsAvailableInOffer = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const products = await productModel.find({ isAvailableInOffer: true, store: req.body.store, isDeleted: false }).populate({ path: "category", select: "categoryName" });;
    if (!products) {
        return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({ success: true, products, message: "All products in offer retrieved successfully" })
})


// exports.getAllSearchProducts = asyncErrorCatch(async (req, res, next) => {
//     if (!req.body.store) {
//         return next(new ErrorHandler(400, "Please enter store Id"))
//     }
//     const products = await productModel.find({
//         store: req.body.store,isAvailableInOffer:false,isDeleted:false, $or: [
//             { productName: { $regex: req.body.searchQuery, $options: 'i' } },
//             { productBarcode: { $regex: req.body.searchQuery } }
//         ]
//     },{dateTillAvailableInOffer:0}).populate({ path: "category", select: "categoryName" });
//     if (products?.length === 0) {
//         return next(new ErrorHandler(400, "No product Found"));
//     }
//     res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
// })
exports.getAllSearchProducts = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }

    const { query } = req
    const filter = {
        store: req.body.store, isDeleted: false, $or: [
            { productName: { $regex: req.body.searchQuery, $options: 'i' } },
            { productBarcode: { $regex: req.body.searchQuery } }
        ]
    }
    if (query?.categoryId) {
        filter.category = query?.categoryId
    }
    const products = await productModel.find(filter, { dateTillAvailableInOffer: 0 }).populate({ path: "category", select: "categoryName" });
    if (products?.length === 0) {
        return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
})
// exports.getAllSearchProductsByNameAndCategory = asyncErrorCatch(async (req, res, next) => {
//     if (!req.body.store) {
//         return next(new ErrorHandler(400, "Please enter store Id"))
//     }
//     const { store, searchQuery, categoryId } = req.body;
//     const query = {
//         store,isDeleted:false,isAvailableInOffer:false, $or: [
//             { productName: { $regex: searchQuery, $options: 'i' } },
//             { productBarcode: { $regex: searchQuery } }
//         ]
//     };
//     if (categoryId) {
//         query.category = categoryId;
//     }
//     const products = await productModel.find(query).populate({ path: "category", select: "categoryName" });
//     if (products?.length === 0) {
//         return next(new ErrorHandler(400, "No product Found"));
//     }
//     res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
// })
exports.getAllSearchProductsByNameAndCategory = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    console.log("comes");
    const { store, searchQuery, categoryId } = req.body;
    const query = {
        store, isDeleted: false, $or: [
            { productName: { $regex: searchQuery, $options: 'i' } },
            { productBarcode: { $regex: searchQuery } }
        ]
    };
    if (categoryId) {
        query.category = categoryId;
    }
    const products = await productModel.find(query).populate({ path: "category", select: "categoryName" });
    if (products?.length === 0) {
        return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
})

//OFFERS
exports.getAllSearchProductsByStoreThatAreNotInOffer = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const products = await productModel.find({
        store: req.body.store, isAvailableInOffer: false, isDeleted: false, $or: [
            { productName: { $regex: req.body.searchQuery, $options: 'i' } },
            { productBarcode: { $regex: req.body.searchQuery } }
        ]
    }, { isAvailableInOffer: 0, discountedPrice: 0, offPercentage: 0 }).populate({ path: "category", select: "categoryName" });
    if (products?.length === 0) {
        return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
})

exports.checkProductsStockAvailable = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.cartProducts) {
        return next(new ErrorHandler(400, "Please enter cart products"))
    }
    let productsArray = [], productObj = {}

    console.log();
    for (let j = 0; j < req.body?.cartProducts?.length; j++) {
        if (!req.body.cartProducts[j].product) {
            return next(new ErrorHandler(400, `Please enter your${req.body?.cartProducts?.length > 1 ? `${j + 1}` : ""} cart item product Id`))
        }
        else if (!req.body.cartProducts[j].stock) {
            return next(new ErrorHandler(400, `Please enter your${req.body?.cartProducts?.length > 1 ? `${j + 1}` : ""} cart item product stock`))
        }
        const product = await productModel.findOne({ _id: req.body.cartProducts[j]?.product });
        productObj._id = product._id
        productObj.quantity = product.quantity
        if (product.isDeleted || product.isAvailableInOffer) {
            productObj.isCurrentlyAvailable = false
        } else {
            productObj.isCurrentlyAvailable = true
        }
        productsArray.push(productObj)
        console.log(product);
    }
    res.status(200).json({ success: true, message: "products check successfully", productsArray })

})


// exports.addProductUsingExcelFile = asyncErrorCatch(async (req, res, next) => {
//   const { storeId } = req.body;

//   const workbook = xlsx.readFile(req.file.path);
//   const sheetName = workbook.SheetNames[0];
//   const sheet = workbook.Sheets[sheetName];
//   const data = xlsx.utils.sheet_to_json(sheet);

//   // Connect to MongoDB
//   const client = new MongoClient(mongoURI);
//   await client.connect();
//   const db = client.db(dbName);
//   const collection = db.collection(collectionName);

//   // Track progress variables
//   let totalRecords = data.length;
//   let processedRecords = 0;
//   let skippedRecords = [];

//   // Process each row of data
//   for (let record of data) {
//     // Check if the image path is present in the data
//     record.store = new mongoose.Types.ObjectId(storeId);
//     record.discountedPrice = 0;
//     record.category = new mongoose.Types.ObjectId(record.category);
//     record.offPercentage = 0;
//     record.isAvailableInOffer = false;
//     record.dateTillAvailableInOffer = null;
//     record.isDeleted = false;

//     // Check if product barcode already exists for the store
//     const existingProduct = await productModel.findOne({
//       store: storeId,
//       productBarcode: record.productBarcode,
//       isDeleted: false,
//     });
// console.log("Existing",existingProduct);
//     if (existingProduct) {
//       skippedRecords.push(record);
//       continue; // Skip adding the record
//     }

//     console.log(record);

//     if (record.image) {
//       // Store the image file on the filesystem with modified filename
//       const imageFileName = `${Date.now()}${path.basename(record.image)}`;
//       const imagePath = path.join(__dirname, 'resources', 'images', 'product', imageFileName);
//       const imageFileData = fs.readFileSync(record.image);

//       // Insert the record into MongoDB with the modified image path
//       await collection.insertOne({ ...record, image: imagePath });
//     } else {
//       // Use the static path for the dummy image
//       record.image = 'resources/images/product/dummy.png';

//       // Insert the record into MongoDB with the static image path
//       await collection.insertOne(record);
//     }

//     // Update progress
//     processedRecords++;
//     const progress = Math.floor((processedRecords / totalRecords) * 100);
//     console.log(`Progress: ${progress}%`);

//     // Send progress to the client
//     res.write(`Progress: ${progress}%\n`);
//   }

//   // Close the MongoDB connection
//   await client.close();

//   // Create a file with skipped records
//   if (skippedRecords.length > 0) {
//     const skippedRecordsFile = path.join(__dirname, 'skipped_records.json');
//     fs.writeFileSync(skippedRecordsFile, JSON.stringify(skippedRecords));
//   }

//   // Return success response
//   res.end('File uploaded and records added to MongoDB successfully.');
// });




// exports.addProductUsingExcelFile = asyncErrorCatch(async (req, res, next) => {
//   const { storeId } = req.body;

//   const workbook = xlsx.readFile(req.file.path);
//   const sheetName = workbook.SheetNames[0];
//   const sheet = workbook.Sheets[sheetName];
//   const data = xlsx.utils.sheet_to_json(sheet);

//   // Connect to MongoDB
//   const client = new MongoClient(mongoURI);
//   await client.connect();
//   const db = client.db(dbName);
//   const collection = db.collection(collectionName);

//   // Track progress variables
//   let totalRecords = data.length;
//   let processedRecords = 0;
//   let skippedRecords = [];

//   // Process each row of data
//   for (let record of data) {
//     // Check if the image path is present in the data
//     record.store = new mongoose.Types.ObjectId(storeId);
//     record.discountedPrice = 0;
//     record.category = new mongoose.Types.ObjectId(record.category);
//     record.offPercentage = 0;
//     record.isAvailableInOffer = false;
//     record.dateTillAvailableInOffer = null;
//     record.isDeleted = false;

//     // Check if product barcode already exists for the store
//     const existingProduct = await productModel.findOne({
//       store: storeId,
//       productBarcode: record.productBarcode,
//       isDeleted: false,
//     });

//     if (existingProduct) {
//       skippedRecords.push(record);
//       continue; // Skip adding the record
//     }

//     console.log(record);

//     if (record.image) {
//       // Store the image file on the filesystem with modified filename
//       const imageFileName = `${Date.now()}${path.basename(record.image)}`;
//       const imagePath = path.join(__dirname, 'resources', 'images', 'product', imageFileName);
//       const imageFileData = fs.readFileSync(record.image);

//       // Insert the record into MongoDB with the modified image path
//       await collection.insertOne({ ...record, image: imagePath });
//     } else {
//       // Use the static path for the dummy image
//       record.image = 'resources/images/product/dummy.png';

//       // Insert the record into MongoDB with the static image path
//       await collection.insertOne(record);
//     }

//     // Update progress
//     processedRecords++;
//     const progress = Math.floor((processedRecords / totalRecords) * 100);
//     console.log(`Progress: ${progress}%`);

//     // Send progress to the client
//     res.write(`Progress: ${progress}%\n`);
//   }

//   // Close the MongoDB connection
//   await client.close();

//   // Generate Excel file with skipped records
//   if (skippedRecords.length > 0) {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Skipped Records');

//     // Add headers
//     const headers = Object.keys(skippedRecords[0]);
//     worksheet.addRow(headers);

//     // Add skipped records
//     for (let record of skippedRecords) {
//       const values = Object.values(record);
//       worksheet.addRow(values);
//     }

//     // Generate the Excel file
//     const filePath = path.join(__dirname, 'skipped_records.xlsx');
//     await workbook.xlsx.writeFile(filePath);

//     // Return the Excel file in the response
//     res.sendFile(filePath);
//   } else {
//     // Return empty response
//     res.end();
//   }
// });


// Send progress update to connected clients
// io.emit('progress', progress);
// Send progress to the client
// res.write(`Progress: ${progress}%\n`);

exports.addProductUsingExcelFile = asyncErrorCatch(async (req, res, next) => {
    const { storeId } = req.body;
    // Access the Socket.IO instance from the app
    const io = req.app.get('io');
    const skippedRecordsSet = new Set();
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Connect to MongoDB
    const client = new MongoClient(mongoURI);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Track progress variables
    let totalRecords = data.length;
    let processedRecords = 0;
    let skippedRecords = [];

    // Process each row of data
    for (let record of data) {
        // Check if the image path is present in the data
console.log(record);
console.log(record.category,"categrom");
console.log(record.categoryName);
        // Check if product barcode already exists for the store
        const existingProduct = await productModel.findOne({
            store: storeId,
            productBarcode: record.productBarcode,
            isDeleted: false,
        });

        // Check if the category ID exists in the category model
        const categoryExists = await productCategoryModel.findOne({ categoryName: record.category,isDeleted:false,store:storeId });

        console.log(categoryExists,"categor");
        record.store = new mongoose.Types.ObjectId(storeId);
        record.discountedPrice = 0;
        record.category = new mongoose.Types.ObjectId(categoryExists?._id);
        record.offPercentage = 0;
        record.isAvailableInOffer = false;
        record.dateTillAvailableInOffer = null;
        record.isDeleted = false;

        
        if (!categoryExists) {
            const {
                isDeleted,
                store,
                discountedPrice,
                offPercentage,
                isAvailableInOffer,
                dateTillAvailableInOffer,
              
                ...recordWithoutExcluded
            } = record;
            // Add the 'error' property with the invalid category ID message
            recordWithoutExcluded.error = 'Category not exist with this name';

            // Check if the record already exists in the skipped records set
            const recordString = JSON.stringify(recordWithoutExcluded);
            if (!skippedRecordsSet.has(recordString)) {
                skippedRecords.push(recordWithoutExcluded);
                skippedRecordsSet.add(recordString);
            }

            continue; // Skip adding the record
        }else if (existingProduct && categoryExists) {
            // Exclude multiple properties from the record object
            // const {
            //     isDeleted,
            //     store,
            //     discountedPrice,
            //     offPercentage,
            //     isAvailableInOffer,
            //     dateTillAvailableInOffer,
            //     ...recordWithoutExcluded
            // } = record;

            // // Add the 'error' property with the reason for skipping the record
            // recordWithoutExcluded.error = 'Product already exists';

            // // Check if the record already exists in the skipped records set
            // const recordString = JSON.stringify(recordWithoutExcluded);
            // if (!skippedRecordsSet.has(recordString)) {
            //     skippedRecords.push(recordWithoutExcluded);
            //     skippedRecordsSet.add(recordString);
            // }
// console.log("record",record.productBarcode,record.quantity,storeId);

            //  collection.deleteOne({store:storeId,productBarcode: record.productBarcode,isDeleted:false},(err,result)=>{
                // if(err){
                //     console.log(err);
                // }else{
                //     console.log(result);
                // }
            // });

            productModel.updateOne({productBarcode: record.productBarcode,store:storeId,isDeleted:false},{$set:{quantity:record.quantity}},(err,result)=>{
                if(err){
                    console.log(err);
                }else{
                    // console.log("result",result);
                }
            })
           console.log("continue");
            continue; // Skip adding the record


        }
        if (record.image) {
            console.log("ceeeeere");
            // Store the image file on the filesystem with modified filename
            const imageFileName = `${Date.now()}${path.basename(record.image)}`;
            const imagePath = path.join(__dirname, 'resources', 'images', 'product', imageFileName);
            const imageFileData = fs.readFileSync(record.image);

            // Insert the record into MongoDB with the modified image path
            await collection.insertOne({ ...record, image: imagePath });
        } else {
            console.log("ceeeeere11111111111");
            // Use the static path for the dummy image
            record.image = 'resources/images/product/dummy.png';

            // Insert the record into MongoDB with the static image path
            await collection.insertOne(record);
        }
        // Update progress
        processedRecords++;
        const progress = Math.floor((processedRecords / totalRecords) * 100);
        console.log(`Progress: ${progress}%`);

        // Emit progress update to connected clients
        io.emit('progress', progress)
    }
    // Close the MongoDB connection
    await client.close();
    // Generate Excel file with skipped records
    if (skippedRecords.length > 0) {
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Skipped Records');

        // Add headers
        const headers = Object.keys(skippedRecords[0]);
        worksheet.addRow(headers);

        // Add skipped records
        for (let record of skippedRecords) {
            const values = Object.values(record);
            worksheet.addRow(values);
        }
        // Generate the Excel file
        const date = moment().format('YYYYMMDDHHmmss');
        const fileName = `skipped_records_${date}.xlsx`;
        const filePath = path.join(__dirname, '..', 'resources', 'failedexcelfiles', fileName);
        await workbook.xlsx.writeFile(filePath);



        // Return the URL of the failed product file in the response
        const url = `https://backened.skipaline.com/resources/failedexcelfiles/${fileName}`;
        res.status(201).json({ success: true, message: 'Uploaded', failedProductUrl: url });
    } else {
        // Return empty response
        res.status(201).json({ success: true, message: 'Uploaded', failedProductUrl: '' });
    }
});
