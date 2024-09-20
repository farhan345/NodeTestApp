const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const fs = require("fs");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const productModel = require("../models/product");
const multer = require("multer");
const xlsx = require("xlsx");
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");
const mongoURI =
  "mongodb+srv://skipaline:skipaline123@estoredb.ulxrvel.mongodb.net/?retryWrites=true&w=majority";
const dbName = "test";
const collectionName = "productmodels";
const path = require("path");
const moment = require("moment");
const exceljs = require("exceljs");
const productCategoryModel = require("../models/productCategory");
// const { io } = require('../server'); // Replace './server' with the correct path to your server.js file

exports.addProduct = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.productName) {
    return next(new ErrorHandler(400, "Please enter product name"));
  }
  if (!req.body.price) {
    return next(new ErrorHandler(400, "Please enter product price"));
  }
  if (!req.body.isTaxable) {
    return next(new ErrorHandler(400, "Please enter taxbale"));
  }
  if (!req.body.quantity) {
    return next(new ErrorHandler(400, "Please enter product quantity"));
  }
  if (!req.body.category) {
    return next(new ErrorHandler(400, "Please select product category"));
  }
  if (!req.body.productBarcode) {
    return next(new ErrorHandler(400, "Please enter product barcode"));
  }
  if (!req.body.productLocation) {
    return next(new ErrorHandler(400, "Please enter product location"));
  }
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.file?.path) {
    return next(new ErrorHandler(400, "Please select your product picture"));
  }
  const oldProduct = await productModel.find({
    store: req.body.store,
    productBarcode: req.body.productBarcode,
    isDeleted: false,
  });
  if (oldProduct.length !== 0) {
    fs.unlinkSync(req.file.path);
    return next(
      new ErrorHandler(
        400,
        "Product with this barcode already exsist in the store"
      )
    );
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
    isTaxable: req.body.isTaxable,
  };
  productModel.create(Data, async (err, result) => {
    if (err) {
      fs.unlinkSync(req.file?.path);
      return next(new ErrorHandler(400, err.message));
    }

    res
      .status(200)
      .json({ success: true, message: "product addedd successfully", result });
  });
});

exports.getSingleProductDetailById = asyncErrorCatch(async (req, res, next) => {
  if (!req.body._id) {
    return next(new ErrorHandler(400, "Please enter product Id"));
  }
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  const product = await productModel
    .findOne({ _id: req.body._id, store: req.body.store, isDeleted: false })
    .populate("category", "categoryName");
  if (!product) {
    return next(new ErrorHandler(401, "product not found"));
  }
  res.status(200).json({
    success: true,
    product,
    message: "product detail retrieved successfully",
  });
});

exports.getSingleProductDetailByBarcode = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.productBarcode) {
      return next(new ErrorHandler(400, "Please enter product barcode"));
    }
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }
    const product = await productModel
      .findOne({
        productBarcode: req.body.productBarcode,
        store: req.body.store,
        isDeleted: false,
      })
      .populate("category", "categoryName");
    if (!product) {
      return next(new ErrorHandler(401, "product not found"));
    }
    res.status(200).json({
      success: true,
      product,
      message: "product detail retrieved successfully",
    });
  }
);

// exports.updateproductInfo = asyncErrorCatch(async (req, res, next) => {
//   debugger;
//   // Validation checks
//   if (!req.body.productName) {
//     return next(new ErrorHandler(400, "Please enter product name"));
//   }
//   if (!req.body.price) {
//     return next(new ErrorHandler(400, "Please enter product price"));
//   }
//   if (!req.body.quantity) {
//     return next(new ErrorHandler(400, "Please enter product quantity"));
//   }
//   if (!req.body.category) {
//     return next(new ErrorHandler(400, "Please select product category"));
//   }
//   if (!req.body.productLocation) {
//     return next(new ErrorHandler(400, "Please select product location"));
//   }
//   if (!req.body.store) {
//     return next(new ErrorHandler(400, "Please enter store Id"));
//   }
//   if (!req.body.isTaxable) {
//     return next(new ErrorHandler(400, "Please enter taxable"));
//   }
//   if (!req.body.productBarcode) {
//     return next(new ErrorHandler(400, "Please add product barcode"));
//   }

//   // Find the product by _id and store, ensure it's not deleted
//   const product = await productModel.findOne({
//     _id: req.body._id,
//     store: req.body.store,
//     isDeleted: false,
//   });
//   if (!product) {
//     return next(new ErrorHandler(400, "Product not found"));
//   }

//   // Data to be updated
//   const Data = {
//     productName: req.body.productName,
//     price: req.body.price,
//     quantity: req.body.quantity,
//     productLocation: req.body.productLocation,
//     category: req.body.category,
//     isTaxable: req.body.isTaxable,
//     productBarcode: req.body.productBarcode,
//     image: req.file ? req.file?.path : product.image, // Only update image if a new file is uploaded
//   };

//   // Update only non-empty fields
//   const newData = await isObjectPropertyEmpty(Data, product);

//   productModel.findByIdAndUpdate(
//     req.body._id,
//     newData,
//     { runValidators: true, new: true }, // Return the updated document
//     async (err, result) => {
//       if (err) {
//         // If there's an error, delete the uploaded image (if any)
//         if (req?.file?.path) {
//           fs.unlinkSync(req.file.path);
//         }
//         return next(new ErrorHandler(400, err.message));
//       } else {
//         // If the update is successful and an image was uploaded, remove the old image
//         if (req?.file?.path && result?.image) {
//           try {
//             fs.unlinkSync(result.image); // Ensure that the old image is deleted safely
//           } catch (error) {
//             console.error("Error deleting old image:", error.message);
//           }
//         }

//         // Fetch the updated product
//         const updatedProduct = await productModel.findById(req.body._id);

//         // Send success response
//         res.status(200).json({
//           success: true,
//           msg: "Product updated",
//           product: updatedProduct,
//         });
//       }
//     }
//   );
// });

exports.updateproductInfo = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.productName)
    return next(new ErrorHandler(400, "Please enter product name"));
  if (!req.body.price)
    return next(new ErrorHandler(400, "Please enter product price"));
  if (!req.body.quantity)
    return next(new ErrorHandler(400, "Please enter product quantity"));
  if (!req.body.category)
    return next(new ErrorHandler(400, "Please select product category"));
  if (!req.body.productLocation)
    return next(new ErrorHandler(400, "Please select product location"));
  if (!req.body.store)
    return next(new ErrorHandler(400, "Please enter store Id"));
  if (!req.body.isTaxable)
    return next(new ErrorHandler(400, "Please enter taxable"));
  if (!req.body.productBarcode)
    return next(new ErrorHandler(400, "Please add productBarcode"));
  const product = await productModel.findOne({
    _id: req.body._id,
    store: req.body.store,
    isDeleted: false,
  });
  if (!product) {
    return next(new ErrorHandler(400, "Product not found"));
  }
  const updateData = {
    productName: req.body.productName,
    price: req.body.price,
    quantity: req.body.quantity,
    productLocation: req.body.productLocation,
    category: req.body.category,
    isTaxable: req.body.isTaxable,
    productBarcode: req.body.productBarcode,
  };
  // Only add image to updateData if a new file is uploaded
  if (req.file) {
    updateData.image = req.file.path;
  }
  try {
    const updatedProduct = await productModel.findByIdAndUpdate(
      req.body._id,
      updateData,
      { new: true, runValidators: true }
    );
    // If a new image was uploaded and there was an old image, delete the old one
    if (req.file && product.image) {
      fs.unlink(product.image, (err) => {
        if (err) console.error("Error deleting old image:", err);
      });
    }
    res
      .status(200)
      .json({ success: true, msg: "Product updated", product: updatedProduct });
  } catch (error) {
    // If there was an error and a new file was uploaded, delete it
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting uploaded file:", err);
      });
    }
    return next(new ErrorHandler(400, error.message));
  }
});

exports.deleteProductByID = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (req.body?.deletedProducts?.length === 0) {
    return next(
      new ErrorHandler(400, "Please select product that you want to be deleted")
    );
  }

  const deletedProducts = req.body.deletedProducts.map((obj) => {
    return obj.product;
  });
  console.log(deletedProducts);
  productModel.updateMany(
    { _id: { $in: deletedProducts } },
    { $set: { isDeleted: true } },
    (err, result) => {
      if (err) {
        return next(new ErrorHandler(400, err.message));
      }
      res.status(200).json({ success: true, message: "product removed" });
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
});
exports.deleteProductByBarcode = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.productBarcode) {
    return next(new ErrorHandler(400, "Please enter product Barcode"));
  }
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  const product = await productModel.findOne({
    productBarcode: req.body.productBarcode,
    store: req.body.store,
    isDeleted: false,
  });
  if (!product) {
    return next(new ErrorHandler(401, "product not found"));
  }
  productModel.findByIdAndDelete(req.body._id, (err, result) => {
    if (err) {
      return next(new ErrorHandler(400, err.message));
    }
    fs.unlinkSync(result.image);
    res.status(200).json({ success: true, message: "product deleted" });
  });
});
exports.getAllproducts = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  const products = await productModel
    .find({ store: req.body.store, isDeleted: false })
    .populate({ path: "category", select: "categoryName" });
  if (!products) {
    return next(new ErrorHandler(400, "No product Found"));
  }
  res.status(200).json({
    success: true,
    products,
    message: "All products retrieved successfully",
  });
});

exports.getAllproductsByCategory = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.category) {
    return next(new ErrorHandler(400, "Please enter category Id"));
  }
  const products = await productModel
    .find({
      store: req.body.store,
      category: req.body.category,
      isDeleted: false,
    })
    .populate({ path: "category", select: "categoryName" });
  if (!products) {
    return next(new ErrorHandler(400, "No product Found"));
  }
  res.status(200).json({
    success: true,
    products,
    message: "All products retrieved successfully",
  });
});

exports.getAllproductsAvailableInOffer = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }
    const products = await productModel
      .find({
        isAvailableInOffer: true,
        store: req.body.store,
        isDeleted: false,
      })
      .populate({ path: "category", select: "categoryName" });
    if (!products) {
      return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({
      success: true,
      products,
      message: "All products in offer retrieved successfully",
    });
  }
);

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
    return next(new ErrorHandler(400, "Please enter store Id"));
  }

  const { query } = req;
  const filter = {
    store: req.body.store,
    isDeleted: false,
    $or: [
      { productName: { $regex: req.body.searchQuery, $options: "i" } },
      { productBarcode: { $regex: req.body.searchQuery } },
    ],
  };
  if (query?.categoryId) {
    filter.category = query?.categoryId;
  }
  const products = await productModel
    .find(filter, { dateTillAvailableInOffer: 0 })
    .populate({ path: "category", select: "categoryName" });
  if (products?.length === 0) {
    return next(new ErrorHandler(400, "No product Found"));
  }
  res.status(200).json({
    success: true,
    products,
    message: "All products retrieved successfully",
  });
});
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
// kkkkkkkkkkk
// exports.getAllSearchProductsByNameAndCategory = asyncErrorCatch(async (req, res, next) => {
//     if (!req.body.store) {
//         return next(new ErrorHandler(400, "Please enter store Id"))
//     }
//     console.log("comes");
//     const { store, searchQuery, categoryId } = req.body;
//     const query = {
//         store, isDeleted: false, $or: [
//             { productName: { $regex: searchQuery, $options: 'i' } },
//             { productBarcode: { $regex: searchQuery } }
//         ]
//     };
//     if (categoryId) {
//         query.category = categoryId;
//     }
//     const products = await productModel.find(query).populate({ path: "category", select: "categoryName" });
//     if (products?.length === 0) {
//         // return next(new ErrorHandler(200, "No product Found"));
//         res.status(200).json({ success: true, message: "No product Found" })
//     }
//     res.status(200).json({ success: true, products, message: "All products retrieved successfully" })
// })
exports.getAllSearchProductsByNameAndCategory = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }

    const { store, searchQuery, categoryId, page = 1, limit = 10 } = req.body;

    const query = {
      store,
      isDeleted: false,
      $or: [
        { productName: { $regex: searchQuery, $options: "i" } },
        { productBarcode: { $regex: searchQuery } },
      ],
    };
    if (categoryId) {
      query.category = categoryId;
    }

    const totalProducts = await productModel.countDocuments(query);
    const products = await productModel
      .find(query)
      .populate({ path: "category", select: "categoryName" })
      .skip((page - 1) * limit)
      .limit(limit);

    if (products.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No product Found",
        products: [],
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: page,
      });
    }

    res.status(200).json({
      success: true,
      products,
      message: "All products retrieved successfully",
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    });
  }
);

//OFFERS
exports.getAllSearchProductsByStoreThatAreNotInOffer = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }
    const products = await productModel
      .find(
        {
          store: req.body.store,
          isAvailableInOffer: false,
          isDeleted: false,
          $or: [
            { productName: { $regex: req.body.searchQuery, $options: "i" } },
            { productBarcode: { $regex: req.body.searchQuery } },
          ],
        },
        { isAvailableInOffer: 0, discountedPrice: 0, offPercentage: 0 }
      )
      .populate({ path: "category", select: "categoryName" });
    if (products?.length === 0) {
      return next(new ErrorHandler(400, "No product Found"));
    }
    res.status(200).json({
      success: true,
      products,
      message: "All products retrieved successfully",
    });
  }
);

exports.checkProductsStockAvailable = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.cartProducts) {
      return next(new ErrorHandler(400, "Please enter cart products"));
    }
    let productsArray = [],
      productObj = {};

    console.log();
    for (let j = 0; j < req.body?.cartProducts?.length; j++) {
      if (!req.body.cartProducts[j].product) {
        return next(
          new ErrorHandler(
            400,
            `Please enter your${
              req.body?.cartProducts?.length > 1 ? `${j + 1}` : ""
            } cart item product Id`
          )
        );
      } else if (!req.body.cartProducts[j].stock) {
        return next(
          new ErrorHandler(
            400,
            `Please enter your${
              req.body?.cartProducts?.length > 1 ? `${j + 1}` : ""
            } cart item product stock`
          )
        );
      }
      const product = await productModel.findOne({
        _id: req.body.cartProducts[j]?.product,
      });
      productObj._id = product._id;
      productObj.quantity = product.quantity;
      if (product.isDeleted || product.isAvailableInOffer) {
        productObj.isCurrentlyAvailable = false;
      } else {
        productObj.isCurrentlyAvailable = true;
      }
      productsArray.push(productObj);
      console.log(product);
    }
    res.status(200).json({
      success: true,
      message: "products check successfully",
      productsArray,
    });
  }
);

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

// exports.addProductUsingExcelFile = asyncErrorCatch(async (req, res, next) => {
//     debugger
//     const { storeId } = req.body;
//     const io = req.app.get('io');
//     const skippedRecordsSet = new Set();
//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     const data = xlsx.utils.sheet_to_json(sheet);

//     const client = new MongoClient(mongoURI);
//     await client.connect();
//     const db = client.db(dbName);
//     const collection = db.collection(collectionName);

//     let totalRecords = data.length;
//     let processedRecords = 0;
//     let skippedRecords = [];

//     for (let record of data) {
//         const existingProduct = await productModel.findOne({
//             store: storeId,
//             productBarcode: record.productBarcode,
//             isDeleted: false,
//         });

//         const categoryExists = await productCategoryModel.findOne({
//             categoryName: record.category,
//             isDeleted: false,
//             store: storeId
//         });

//         record.store = new mongoose.Types.ObjectId(storeId);
//         record.discountedPrice = 0;
//         record.category = categoryExists ? new mongoose.Types.ObjectId(categoryExists._id) : null;
//         record.offPercentage = 0;
//         record.isAvailableInOffer = false;
//         record.dateTillAvailableInOffer = null;
//         record.isDeleted = false;

//         if (!categoryExists) {
//             const { isDeleted, store, discountedPrice, offPercentage, isAvailableInOffer, dateTillAvailableInOffer, ...recordWithoutExcluded } = record;
//             recordWithoutExcluded.error = 'Category not exist with this name';

//             const recordString = JSON.stringify(recordWithoutExcluded);
//             if (!skippedRecordsSet.has(recordString)) {
//                 skippedRecords.push(recordWithoutExcluded);
//                 skippedRecordsSet.add(recordString);
//             }
//             continue;
//         } else if (existingProduct && categoryExists) {
//             productModel.updateOne({ productBarcode: record.productBarcode, store: storeId, isDeleted: false }, { $set: { quantity: record.quantity } }, (err, result) => {
//                 if (err) {
//                     console.log(err);
//                 }
//             });
//             continue;
//         }

//         // Placeholder for image path if it's not in the record
//         const imageFileName = record.productBarcode ? `${record.productBarcode}.png` : 'default.png';
//         const imagePath = path.join(__dirname, 'resources', 'images', 'product', imageFileName);

//         // Check if image file exists and read or use default image
//         if (fs.existsSync(imagePath)) {
//             record.image = imagePath;
//         } else {
//             record.image = 'resources/images/product/dummy.png';
//         }

//         await collection.insertOne(record);

//         processedRecords++;
//         const progress = Math.floor((processedRecords / totalRecords) * 100);
//         console.log(`Progress: ${progress}%`);
//         io.emit('progress', progress);
//     }

//     await client.close();

//     if (skippedRecords.length > 0) {
//         const workbook = new exceljs.Workbook();
//         const worksheet = workbook.addWorksheet('Skipped Records');

//         const headers = Object.keys(skippedRecords[0]);
//         worksheet.addRow(headers);

//         for (let record of skippedRecords) {
//             const values = Object.values(record);
//             worksheet.addRow(values);
//         }

//         const date = moment().format('YYYYMMDDHHmmss');
//         const fileName = `skipped_records_${date}.xlsx`;
//         const filePath = path.join(__dirname, '..', 'resources', 'failedexcelfiles', fileName);
//         await workbook.xlsx.writeFile(filePath);

//         const url = `${process.env.BaseUrl}/resources/failedexcelfiles/${fileName}`;
//         res.status(201).json({ success: true, message: 'Uploaded', failedProductUrl: url });
//     } else {
//         res.status(201).json({ success: true, message: 'Uploaded', failedProductUrl: '' });
//     }
// });

// exports.addProductUsingExcelFile = asyncErrorCatch(async (req, res, next) => {
//   const { storeId } = req.body;
//   const io = req.app.get("io");
//   const skippedRecordsSet = new Set();
//   const workbook = xlsx.readFile(req.file.path);
//   const sheetName = workbook.SheetNames[0];
//   const sheet = workbook.Sheets[sheetName];
//   const data = xlsx.utils.sheet_to_json(sheet);

//   const client = new MongoClient(mongoURI);
//   await client.connect();
//   const db = client.db(dbName);
//   const collection = db.collection(collectionName);

//   let totalRecords = data.length;
//   let processedRecords = 0;
//   let skippedRecords = [];

//   for (let record of data) {
//     const existingProduct = await productModel.findOne({
//       store: storeId,
//       productBarcode: record.productBarcode,
//       isDeleted: false,
//     });

//     const categoryExists = await productCategoryModel.findOne({
//       categoryName: record.category,
//       isDeleted: false,
//       store: storeId,
//     });

//     record.store = new mongoose.Types.ObjectId(storeId);
//     record.discountedPrice = 0;
//     record.category = categoryExists
//       ? new mongoose.Types.ObjectId(categoryExists._id)
//       : null;
//     record.offPercentage = 0;
//     record.isAvailableInOffer = false;
//     record.dateTillAvailableInOffer = null;
//     record.isDeleted = false;
//     record.isTaxable = record.tax === 1; // Set isTaxable based on tax value

//     // Add version key manually
//     record.__v = 0;

//     if (!categoryExists) {
//       const {
//         isDeleted,
//         store,
//         discountedPrice,
//         offPercentage,
//         isAvailableInOffer,
//         dateTillAvailableInOffer,
//         ...recordWithoutExcluded
//       } = record;
//       recordWithoutExcluded.error = "Category not exist with this name";

//       const recordString = JSON.stringify(recordWithoutExcluded);
//       if (!skippedRecordsSet.has(recordString)) {
//         skippedRecords.push(recordWithoutExcluded);
//         skippedRecordsSet.add(recordString);
//       }
//       continue;
//     } else if (existingProduct && categoryExists) {
//       await productModel.updateOne(
//         {
//           productBarcode: record.productBarcode,
//           store: storeId,
//           isDeleted: false,
//         },
//         {
//           $inc: { quantity: record.quantity },
//           $set: { isTaxable: record.isTaxable },
//         }
//       );
//       continue;
//     }

//     // Placeholder for image path if it's not in the record
//     const imageFileName = record.productBarcode
//       ? `${record.productBarcode}.png`
//       : "default.png";
//     const imagePath = path.join(
//       __dirname,
//       "resources",
//       "images",
//       "product",
//       imageFileName
//     );

//     // Check if image file exists and read or use default image
//     if (fs.existsSync(imagePath)) {
//       record.image = imagePath;
//     } else {
//       // record.image = "resources/images/product/dummy.png";
//       record.image = "resources/images/product/dummy.png";
//     }

//     await collection.insertOne(record);

//     processedRecords++;
//     const progress = Math.floor((processedRecords / totalRecords) * 100);
//     console.log(`Progress: ${progress}%`);
//     io.emit("progress", progress);
//   }

//   await client.close();

//   if (skippedRecords.length > 0) {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet("Skipped Records");

//     const headers = Object.keys(skippedRecords[0]);
//     worksheet.addRow(headers);

//     for (let record of skippedRecords) {
//       const values = Object.values(record);
//       worksheet.addRow(values);
//     }

//     const date = moment().format("YYYYMMDDHHmmss");
//     const fileName = `skipped_records_${date}.xlsx`;
//     const filePath = path.join(
//       __dirname,
//       "..",
//       "resources",
//       "failedexcelfiles",
//       fileName
//     );
//     await workbook.xlsx.writeFile(filePath);

//     const url = `${process.env.BaseUrl}/resources/failedexcelfiles/${fileName}`;
//     res
//       .status(201)
//       .json({ success: true, message: "Uploaded", failedProductUrl: url });
//   } else {
//     res
//       .status(201)
//       .json({ success: true, message: "Uploaded", failedProductUrl: "" });
//   }
// });
exports.addProductUsingExcelFile = asyncErrorCatch(async (req, res, next) => {
  const { storeId } = req.body;
  const io = req.app.get("io");
  const skippedRecordsSet = new Set();
  const workbook = xlsx.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  const client = new MongoClient(mongoURI, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  let totalRecords = data.length;
  let processedRecords = 0;
  let skippedRecords = [];

  // Fetch all categories for the store at once
  const categories = await productCategoryModel
    .find({
      store: storeId,
      isDeleted: false,
    })
    .lean();
  const categoryMap = new Map(
    categories.map((cat) => [cat.categoryName, cat._id])
  );

  // Fetch all existing products for the store at once
  const existingProducts = await productModel
    .find({
      store: storeId,
      isDeleted: false,
    })
    .lean();
  const productMap = new Map(
    existingProducts.map((prod) => [prod.productBarcode, prod])
  );

  const bulkOps = [];
  const updateOps = [];

  for (let record of data) {
    const categoryId = categoryMap.get(record.category);
    const existingProduct = productMap.get(record.productBarcode);

    record.store = new mongoose.Types.ObjectId(storeId);
    record.discountedPrice = 0;
    record.category = categoryId
      ? new mongoose.Types.ObjectId(categoryId)
      : null;
    record.offPercentage = 0;
    record.isAvailableInOffer = false;
    record.dateTillAvailableInOffer = null;
    record.isDeleted = false;
    record.isTaxable = record.tax === 1;
    record.__v = 0;

    if (!categoryId) {
      const {
        isDeleted,
        store,
        discountedPrice,
        offPercentage,
        isAvailableInOffer,
        dateTillAvailableInOffer,
        ...recordWithoutExcluded
      } = record;
      recordWithoutExcluded.error = "Category not exist with this name";
      const recordString = JSON.stringify(recordWithoutExcluded);
      if (!skippedRecordsSet.has(recordString)) {
        skippedRecords.push(recordWithoutExcluded);
        skippedRecordsSet.add(recordString);
      }
      continue;
    }

    if (existingProduct) {
      updateOps.push({
        updateOne: {
          filter: { _id: existingProduct._id },
          update: {
            $inc: { quantity: record.quantity },
            $set: { isTaxable: record.isTaxable },
          },
        },
      });
    } else {
      const imageFileName = record.productBarcode
        ? `${record.productBarcode}.png`
        : "default.png";
      const imagePath = path.join(
        __dirname,
        "resources",
        "images",
        "product",
        imageFileName
      );
      record.image = fs.existsSync(imagePath) ? imagePath : null;

      bulkOps.push({ insertOne: { document: record } });
    }

    processedRecords++;
    if (processedRecords % 10 === 0) {
      const progress = Math.floor((processedRecords / totalRecords) * 100);
      io.emit("progress", progress);
    }
  }

  // Perform bulk operations
  if (bulkOps.length > 0) await collection.bulkWrite(bulkOps);
  if (updateOps.length > 0) await productModel.bulkWrite(updateOps);

  await client.close();

  if (skippedRecords.length > 0) {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Skipped Records");

    const headers = Object.keys(skippedRecords[0]);
    worksheet.addRow(headers);
    skippedRecords.forEach((record) => worksheet.addRow(Object.values(record)));

    const date = moment().format("YYYYMMDDHHmmss");
    const fileName = `skipped_records_${date}.xlsx`;
    const filePath = path.join(
      __dirname,
      "..",
      "resources",
      "failedexcelfiles",
      fileName
    );
    await workbook.xlsx.writeFile(filePath);

    const url = `${process.env.BaseUrl}/resources/failedexcelfiles/${fileName}`;
    res
      .status(201)
      .json({ success: true, message: "Uploaded", failedProductUrl: url });
  } else {
    res
      .status(201)
      .json({ success: true, message: "Uploaded", failedProductUrl: "" });
  }
});
