const mongoose = require('mongoose');
const plm=require("passport-local-mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/pintproj");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }

  


});



userSchema.plugin(plm);
// Create the User model
module.exports = mongoose.model('User', userSchema);


