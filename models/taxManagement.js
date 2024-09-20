const mongoose = require('mongoose');

const taxManagementSchema = new mongoose.Schema({
    country: {
        type: String,
        required: [true, "please enter country"]
    },
    state: {
        type: String,
        required: [true, 'please enter state']
    },
    tax: {
        type: Number,
        required: [true, 'please enter tax']
    }
});

const taxManagementModel = mongoose.model('taxManagementModel', taxManagementSchema);
module.exports = taxManagementModel;