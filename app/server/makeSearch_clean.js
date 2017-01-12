var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Movie = require('../movie_schema'),
	Tmp = require('../tmp_schema'),
	promise = require('promise'),
	search = require('./api/search'),
	omdb = require('omdb'),
	async = require("async"),
	test = require('assert'),
	Nightmare = require('nightmare'),
	subs = require('./makeSearch_subs'),
	_ = require('lodash');

var torrentStream = require('torrent-stream');
var mimeTypes = require('./mine-type.js');

const PirateBay = require('thepiratebay');
const Yts = require('yify-search');
const OS = require('opensubtitles-api');
var request = require('request');
var srt2vtt = require('srt-to-vtt');
var fs = require("fs");

var getExtension = function (name) {
    return name.match("\.([^.]*)$")[0];
}

var validExtension = function (name) {
    var ext = getExtension(name);
    console.log(ext);
    if (ext !== null && mimeTypes[ext] !== undefined)
        return mimeTypes[ext];
    return false;
}



var cleanTop = function () {
// 	console.log('test')
	return new Promise ((resolve, reject) => {
		var movies = [];
		Tmp.find({}, function(err, results){
			// console.log(results);
			// results.forEach(function(result){
			async.each(results, function(result, callback){
				var file_size = 0;
				if (result.torrent.magnetLink) {
					var engine = torrentStream(result.torrent.magnetLink);
					engine.on('ready', function () {
	                	engine.files.forEach(function (file) {
	                	// ON SELECTIONNE LE PLUS GROS FICHIER AVEC EXTENSION VALABLE
	                    	if (file_size < file.length) {
	                        	file_size = file.length;
	                        	movie_file = file;
	                    	}
	            		});
	                	engine.removeAllListeners();
	                	engine.destroy();
	                	if (!(ext = validExtension(movie_file.name))) {
	                		Tmp.remove({ '_id': result._id }, function (err) {
	  							if (err) return handleError(err);
	  							// console.log(result.movie.title+ " ======> removed from DB : bad format");
							});
							Movie.remove({ '_id': result._id }, function (err) {
	  							if (err) return handleError(err);
	  							// console.log(result.movie.title+ " ======> removed from DB : bad format");
							});
	                	} else {
	                		console.log('Downloading subtitles');
	                		// movies.push(result);
	                		subs(result)
	                		.then(function(movie){
	                			movies.push(movie);
	                		});

							// Movie.update({'torrent.id': result.torrent.id}, {$set : {ext: ext}});
							// console.log(result.movie.title+' ==> Good Format');
						}
					})
					callback(null);
				} 
			}, function(err){
				resolve(movies);
			})	
		})
		
	})
}

module.exports = cleanTop;