const multer = require('multer')
//handle errors
const customErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error"

    // if(err instanceof multer.MulterError){
    //     res.status(err.statusCode).send({success:false,msg:err.message,stack:err.stack})
    // }
    res.status(err.statusCode).send({ success: false, message: err.message, stack: err.stack })
}

module.exports = customErrorHandler;