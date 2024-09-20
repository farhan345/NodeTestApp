// imports
const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const { countriesData } = require("../utils/countries_data");
const taxManagementModel = require("../models/taxManagement");

// methods
exports.getAllCountries = asyncErrorCatch(async (req, res, next) => {
  let countries = countriesData.map((x) => ({ country: x?.name }));
  return res.status(200).json({
    success: true,
    message: "All coutries data is here!",
    data: countries,
  });
});

exports.getAllStates = asyncErrorCatch(async (req, res, next) => {
  if (!req?.body?.country) {
    return res
      .status(400)
      .json({ success: false, message: "Add a country first!" });
  }
  let countryData = countriesData.find((x) => x?.name == req?.body?.country);
  console.log(countryData);
  if (countryData == undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Country not found :(" });
  }
  let finalData = {
    country: req?.body?.country,
    states: countryData?.states,
  };
  return res.status(200).json({
    success: true,
    message: "All states data is here!",
    data: finalData,
  });
});

// crud starts

// create starts
// exports.addTaxing = asyncErrorCatch(async (req, res, next) => {
//   debugger;
//   // validation starts
//   if (!req?.body?.country) {
//     return next(new ErrorHandler(400, "Country can not be null!"));
//   }
//   if (!req?.body?.state) {
//     return next(new ErrorHandler(400, "State can not be null!"));
//   }
//   if (!req?.body?.tax) {
//     return next(new ErrorHandler(400, "Tax can not be null!"));
//   }
//   // validation ends
//   const addData = {
//     country: req?.body?.country,
//     state: req?.body?.state,
//     tax: req?.body?.tax,
//   };
//   // check if data already exists
//   const existingData = await taxManagementModel.findOneAndUpdate(
//     {
//       country: req?.body?.country,
//       state: req?.body?.state,
//     },
//     addData,
//     { new: true, upsert: true }
//   );

//   return res.status(200).json({
//     success: true,
//     message: "Data updated/added successfully",
//     data: existingData,
//   });
// });

exports.addTaxing = asyncErrorCatch(async (req, res, next) => {
  // validation starts
  if (!req?.body?.country) {
    return next(new ErrorHandler(400, "Country cannot be null!"));
  }
  if (
    !req?.body?.data ||
    !Array.isArray(req.body.data) ||
    req.body.data.length === 0
  ) {
    return next(
      new ErrorHandler(
        400,
        "Invalid data format! 'data' array is required with at least one object."
      )
    );
  }
  // validation ends

  const country = req.body.country;
  const taxData = req.body.data;

  // Process each state tax data
  const promises = taxData.map(async (item) => {
    // validation
    if (!item.state) {
      throw new ErrorHandler(400, "State cannot be null!");
    }
    if (!item.tax) {
      throw new ErrorHandler(400, "Tax cannot be null!");
    }

    const addData = {
      country: country,
      state: item.state,
      tax: item.tax,
    };

    // Check if data already exists
    const existingData = await taxManagementModel.findOneAndUpdate(
      {
        country: country,
        state: item.state,
      },
      addData,
      { new: true, upsert: true }
    );

    return existingData;
  });

  Promise.all(promises)
    .then((results) => {
      return res.status(200).json({
        success: true,
        message: "Data updated/added successfully",
        data: results,
      });
    })
    .catch((error) => {
      return next(error);
    });
});
// create ends

// view starts
exports.viewTaxDataByCountry = asyncErrorCatch(async (req, res, next) => {
  // debugger;
  // validation starts
  if (!req?.body?.country) {
    return next(new ErrorHandler(400, "Country parameter is required!"));
  }
  // validation ends

  const country = req?.body?.country;

  // Retrieve tax data for the specified country
  const taxData = await taxManagementModel.find({ country: country });

  if (!taxData || taxData.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No tax data found for the specified country.",
      data: [],
    });
  } else {
    return res.status(200).json({
      success: true,
      message: "Tax data retrieved successfully!",
      data: taxData,
    });
  }
});
// view ends

// delete starts
exports.deleteTaxData = asyncErrorCatch(async (req, res, next) => {
  // debugger;
  // validation starts
  if (!req?.body?.country) {
    return next(new ErrorHandler(200, "Country parameter is required!"));
  }
  if (!req?.body?.state) {
    // If state parameter is not provided, return error
    return next(new ErrorHandler(200, "State parameter is required!"));
  }
  // validation ends

  const country = req.body.country;
  const state = req.body.state;

  // Find and delete tax data for the specified country and state
  const deletedData = await taxManagementModel.deleteOne({
    country: country,
    state: state,
  });

  if (deletedData.deletedCount === 0) {
    return res.status(200).json({
      success: false,
      message: "No tax data found for the specified country and state.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Tax data deleted successfully",
  });
});
// delete ends
// crud ends
