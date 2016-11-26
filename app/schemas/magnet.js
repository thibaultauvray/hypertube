var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var magnet = new Schema({
    url: { type: String, unique: true, required: true, dropDups: true },
    path:  { type: String, required: true },
    name: { type: String, required: true },
    finish: { type: Boolean, required: true, default: 0}
},
{
    timestamps: true
});


var Magnet = mongoose.model('Magnet', magnet);
module.exports = Magnet;
