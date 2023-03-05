const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    host: String,
    redirect: String,
    redirect_path: Boolean
})

module.exports = mongoose.model("hosts", schema, "hosts")