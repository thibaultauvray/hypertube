var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Movie = require('../movie_schema'),
	Tmp = require('../tmp_schema'),
	promise = require('promise'),
	search = require('./api/search'),
	omdb = require('omdb'),
	async = require("async"),
	test = require('assert'),
	cleanTop = require('./makeSearch_clean'),
	Nightmare = require('nightmare'),
	_ = require('lodash');

var torrentStream = require('torrent-stream');
var mimeTypes = require('./mine-type.js');

const PirateBay = require('thepiratebay');
const Yts = require('yify-search');
const OS = require('opensubtitles-api');
var request = require('request');
var srt2vtt = require('srt-to-vtt');
var fs = require("fs");
const OpenSubtitles = new OS({
	useragent: "OSTestUserAgentTemp",
	username: 'nocalis',
	password: require('crypto').createHash('md5').update('azerty').digest('hex'),
	ssl: true
});

var db = mongoose.connection;

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

var omdbSearch = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			var movies = [];
			var vu = false;
			var i = 0;
			
			var Query_regex = new RegExp(req.params.text,'i');
			
			mongoose.connection.db.dropCollection('tmp', function(err, result) {});

		    /////////test dans la DB avant tout
		   	if (req.params.search === 'local') {
			    Movie.find({'movie.title': Query_regex}, function(err, results){
			    	if (results.length > 0) { 		
			    		results.forEach(function(result){
			    			movies.push({_id: result._id, movie: result.movie, torrent: result.torrent, vu});
			    			var film = new Tmp({_id: mongoose.Types.ObjectId(), movie: result.movie, torrent: result.torrent});
							film.save(function(err) {
							  	// if (err) console.log(err);
							})	
			    		})
			    		res.render('search', {
												isApp : true,
												isLibrary : true,
												noResult: false,
												title : 'Hypertube - Search',
												firstname : _.capitalize(user.firstname),
												language : user.language,
												movies : movies
								
						})
					} else {
						res.render('search', {
												isApp : true,
												isLibrary : false,
												noResult: true,
												title : 'Hypertube - Search',
												firstname : _.capitalize(user.firstname),
												language : user.language,
												movies : movies
								
						})
					}
				})
		    } else if (req.params.search === "tpb") {
		    	//////////////////////////////////// Recherche ====================> "ThePirateBay"    	    	    		
				PirateBay.search(req.params.text, {
					category: 200,    // default - 'all' | 'all', 'audio', 'video', 'xxx', 
					                  //                   'applications', 'games', 'other' 
					                  // 
					                  // You can also use the category number: 
					                  // `/search/0/99/{category_number}` 
						filter: {
							verified: false    	// default - false | Filter all VIP or trusted torrents 
						},
						page: 0,            	// default - 0 - 99 
						orderBy: 'seeds', 	// default - name, date, size, seeds, leeches 
						sortBy: 'desc'    	// default - desc, asc 
					})
				.then(torrents => {
					var torrents = torrents.slice(0, 6);
					console.log(torrents.length);
					async.each(torrents, function(torrent, callback) {
				   		var file_size = 0;
						if (torrent.magnetLink) {
							var engine = torrentStream(torrent.magnetLink);
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
		                         
		        	            if (ext = validExtension(movie_file.name)) {
							    	var imdb = new Nightmare({executionTimeout: 3000 })
								    .useragent("Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36")
								    .goto(torrent.link)
								    //.wait()
								    .evaluate( function() {
									    if (document.querySelector("dd > a[title=IMDB]"))
								    	    return (document.querySelector("dd > a[title=IMDB]").href.match(/((tt[0-9]{7,8})\/)/)[0].slice(0, -1));
									    else if (document.querySelector("pre").innerText.match(/((tt[0-9]{7,8})\/)/))
									    	return (document.querySelector("pre").innerText.match(/((tt[0-9]{7,8})\/)/)[0].slice(0, -1));
									    else
									    	return (null);
									})
									.run(function(err, nightmare) {
									  	if (err) return console.log(err);
									   	if (nightmare) {
										    omdb.get(nightmare, function(err, movie) {
										    	var film = ({_id: mongoose.Types.ObjectId(), movie, torrent, ext})
										      	
										       	var store_tmp = new Tmp(film);
										        // var store = new Movie({_id: mongoose.Types.ObjectId(), movie, torrent, ext});
										        var store_db = new Movie(film);
										        movies.push(film);
										        store_tmp.save(function(err) {
										          	// if (err) console.log(err);
										        })
										        store_db.save(function (err) {
										        	// body...
										        })
												Movie.findOne({'_id': film._id}, function(err, result){
													console.log('Erreur' + err);
													console.log('result' + result);
												   	if (!result) {
												        OpenSubtitles.login()
														.then(function (res) {
															OpenSubtitles.search({
																imdbid: nightmare
															})
															.then(function (data) {
																/*var file = fs.createWriteStream("f.txt");
																var request = http.get(subtitles.fr.url, function(response) {
																response.pipe(file);
																});*/
																if (Object.keys(data).length === 0 || (!data.en && !data.fr))
																	subtitles = {en : "", fr:""};
																else if (data.en && data.fr)
																	subtitles = {en: data.en.url , fr : data.fr.url };
																else if (data.en)
																	subtitles = {en: data.en.url , fr : "" };
																else if (data.fr)
																	subtitles = {en: "" , fr : data.fr.url };
																path = __dirname + "/../public/subtitles/" + torrent.id + "/";
																console.log(path);
																if (!fs.existsSync(path)){
																	fs.mkdirSync(path);
																}
																Object.keys(subtitles).forEach(function(e){
																	console.log(subtitles[e]);
																	if (subtitles[e].length != 0) {
																		request.get(subtitles[e]).pipe(srt2vtt()).pipe(fs.createWriteStream(path + torrent.id + "-" + e + '.vtt'));
																	}
																});

    															Movie.update({'torrent.id':film.torrent.id}, {$set: {subtitles: subtitles}}, function(err, fuck){
																	console.log('err :'+err);
																	console.log(fuck);
																});
																// var film = new Movie({_id: mongoose.Types.ObjectId(), movie, torrent, subtitles, ext});
																// film.save(function(err){
																// 	// if (err) {
																// 	// 	console.log('---------\n');
																// 	// 	console.log(err);
																// 	// }
																// });
															});
														});
													}
												})
											})
										}
										// console.log(i);
										// i++;
										callback(null);
									})
									.end()
								} else {
									callback(null);
								}
						  	})
					  	}
					}, function(err) {
					    if (movies.length > 0){
						    res.render('search', {
								isApp : true,
								isLibrary : true,
								noResult: false,
								title : 'Hypertube - Search',
								firstname : _.capitalize(user.firstname),
								language : user.language,
								movies : movies
							})
						} else {
							res.render('search', {
								isApp : true,
								isLibrary : false,
								noResult: true,
								title : 'Hypertube - Search',
								firstname : _.capitalize(user.firstname),
								language : user.language,
								movies : movies
								
							})
						}
					}) 
				})
			} else if (req.params.search === 'yts') {
				///////////// Recherche ====================> "Yts - Yify"
				Yts.search(req.params.text, (error, results) => {
					if (error) throw error;
					var movies = [];
					// results.forEach(function(result){
					async.each(results, function(result, callback){
						var file_size = 0;
						// console.log(result.magnet);
						if (result.magnet){						
							var engine = torrentStream(result.magnet);
							engine.on('ready', function () {
				        	    engine.removeAllListeners();
			                    engine.destroy();    
								result.torrents.forEach(function(data){							
									omdb.get(result.imdb_code, function(err, movie) {		
										var torrent =  
											{
												id 			: result.id,
												name 		: data.quality,
												size 		: data.size,
												seeders 	: data.seeds,
												leechers	: data.peers,
												uploadDate 	: data.date_uploaded,
												magnetLink 	: result.magnet,
											}
										var film = ({_id: mongoose.Types.ObjectId(), movie, torrent});
										var store_tmp = new Tmp(film);
										var store_db = new Movie(film);
										// console.log(store.movie.title);
										// movies.push(film);
										store_tmp.save(function(err) {
										   	// if (err) console.log(err);
										})
										store_db.save(function(err){
											 if (err) console.log("EROOR " + err);
										})
										movies.push(film);
										Movie.findOne({'_id': film._id}, function(err, resp){
											console.log('Erreur' + err);
											console.log('result' + result);
										   	if (!resp) {
										        OpenSubtitles.login()
												.then(function (res) {
													OpenSubtitles.search({
														imdbid: result.imdb_code
													})
													.then(function (data) {
														/*var file = fs.createWriteStream("f.txt");
														var request = http.get(subtitles.fr.url, function(response) {
														response.pipe(file);
														});*/
														if (Object.keys(data).length === 0 || (!data.en && !data.fr))
															subtitles = {en : "", fr:""};
														else if (data.en && data.fr)
															subtitles = {en: data.en.url , fr : data.fr.url };
														else if (data.en)
															subtitles = {en: data.en.url , fr : "" };
														else if (data.fr)
															subtitles = {en: "" , fr : data.fr.url };
														path = __dirname + "/../public/subtitles/" + torrent.id + "/";
														console.log(path);
														if (!fs.existsSync(path)){
															fs.mkdirSync(path);
														}
														Object.keys(subtitles).forEach(function(e){
															console.log(subtitles[e]);
															if (subtitles[e].length != 0) {
																request.get(subtitles[e]).pipe(srt2vtt()).pipe(fs.createWriteStream(path + torrent.id + "-" + e + '.vtt'));
															}
														});
   														Movie.update({'torrent.id':film.torrent.id}, {$set: {subtitles: subtitles}}, function(err, fuck){
															console.log('err :'+err);
															console.log(fuck);
														});
																// var film = new Movie({_id: mongoose.Types.ObjectId(), movie, torrent, subtitles, ext});
																// film.save(function(err){
																// 	// if (err) {
																// 	// 	console.log('---------\n');
																// 	// 	console.log(err);
																// 	// }
																// });
													});
												});
											}
										})										
									})
								})
								callback(null);
							})
						}
					}, function(err){
						// console.log(movies);
						// cleanTop()
						// .then(function (movies){
						// 	console.log('movies =>>>>>>>>>>>>>>>>>>>>>>>>>>> '+ movies);
							if (movies.length){
							    res.render('search', {
									isApp : true,
									isLibrary : true,
									noResult: false,
									title : 'Hypertube - Search',
									firstname : _.capitalize(user.firstname),
									language : user.language,
									movies : movies
								})
							} else {
								res.render('search', {
									isApp : true,
									isLibrary : false,
									noResult: true,
									title : 'Hypertube - Search',
									firstname : _.capitalize(user.firstname),
									language : user.language,
									movies : movies
									
								})
							}
						// })
					})
				})	
			}	
		} else {
				console.log('User not found or not logged in, redirect to home page');
				res.redirect('/');
		}
	});		
};	

module.exports = omdbSearch;
