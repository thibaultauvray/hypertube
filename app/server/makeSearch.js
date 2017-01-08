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

	    ///////////test dans la DB avant tout
	    Movie.find({'movie.title': Query_regex}, function(err, results){
	    	if (results.length > 0) { 		
	    		results.forEach(function(result){
	    			movies.push({movie: result.movie, torrent: result.torrent, vu});
	    			var film = new Tmp({_id: mongoose.Types.ObjectId(), movie: result.movie, torrent: result.torrent});
					film.save(function(err) {
					  	// if (err) console.log(err);
					})	
	    		})
	    		res.render('search', {
										isApp : true,
										isLibrary : true,
										title : 'Hypertube - Search',
										firstname : _.capitalize(user.firstname),
										language : user.language,
										movies : movies
						
				})	    		
	    	} else {
	    		///////////// ici choix du moteur de recherche    	    
				if (req.params.search === "tpb") {
					//////////////////////////////////////// 1er Moteur de Recherche: "PirateBay"
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
	                                    // })
	                                if (ext = validExtension(movie_file.name)) {
								    	var imdb = new Nightmare({executionTimeout: 1000 })
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
											        	movies.push({movie, torrent, vu});
												       	var film = new Tmp({_id: mongoose.Types.ObjectId(), movie, torrent, ext});
												        film.save(function(err) {
												          	// if (err) console.log(err);
												        })

												        Movie.findOne({'torrent.id':torrent.id}, function(err, result){
												          	if (!result){
												          		OpenSubtitles.login()
																.then(function (res) {
																	OpenSubtitles.search({
																		imdbid: nightmare
																	}).then(function (data) {
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
																		var film = new Movie({_id: mongoose.Types.ObjectId(), movie, torrent, subtitles, ext});
																		film.save(function(err){
																			// if (err) {
																			// 	console.log('---------\n');
																			// 	console.log(err);
																			// }
																		});
																	});
																});
												          	}
												        })
												    })
										      	}  
									      	callback(null);
									    })
									    .end()
									}
						  		})
					  		}
					  	}, function(err) {
					      	res.render('search', {
										isApp : true,
										isLibrary : true,
										title : 'Hypertube - Search',
										firstname : _.capitalize(user.firstname),
										language : user.language,
										movies : movies
							});
					  }); 
					})
					.catch(err => {
				  		console.log(err)
					});
				} else {
					///////////////////////////////////////////////////// 2eme Moteur de Recherche: "Yts"
					Yts.search(req.params.text, (error, results) => {
						if (error) throw error;

						// results.forEach(function(result){
						async.each(results, function(result, callback){
							var file_size = 0;
							// console.log(result.magnet);
							if (result.magnet){
								var engine = torrentStream(result.magnet);
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
												var film = new Tmp({_id: mongoose.Types.ObjectId(), movie, torrent, ext});
												movies.push({movie, torrent, vu});
												film.save(function(err) {
												          	// if (err) console.log(err);
												})
												Movie.findOne({'torrent.id':torrent.id, 'torrent.name':torrent.name}, function(err, rees){
											      	if (!rees){
												      	OpenSubtitles.login()
														.then(function (res) {
															OpenSubtitles.search({
																imdbid: result.imdb_code
															}).then(function (data) {
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

																if (!fs.existsSync(path)){
																	fs.mkdirSync(path);
																}
																Object.keys(subtitles).forEach(function(e){

																	if (subtitles[e].length != 0) {
																		request.get(subtitles[e]).pipe(srt2vtt()).pipe(fs.createWriteStream(path + torrent.id + "-" + e + '.vtt'));
																	}
																});
																var film = new Movie({_id: mongoose.Types.ObjectId(), movie, torrent, subtitles, ext});
																film.save(function(err){
																	//  		if (err) {
																	// 	console.log('---------\n');
																	// 	console.log(err);
																	// }
																});
															});
														});

												   	}
												})
											})

										})
									}
									callback(null);
								})
							}
						}, function(err){
							res.render('search', {
											isApp : true,
											isLibrary : true,
											title : 'Hypertube - Search',
											firstname : _.capitalize(user.firstname),
											language : user.language,
											movies : movies
							
							})
						})
					})
				}
		
			}
	    })	
	} else {
			console.log('User not found or not logged in, redirect to home page');
			res.redirect('/');
		}
	});		
};	

module.exports = omdbSearch;

/*	
var makeSearch = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			search(req).then(function(movies) {
				for (var i = 0; i < movies.length; i++) {
					movies[i].director = movies[i].director ? movies[i].director.split(', ')[0] : 'N/A';
					movies[i].runtime = movies[i].runtime ? movies[i].runtime : 'N/A';
					movies[i].actors = movies[i].actors ? movies[i].actors.slice(2).join(', ') : 'N/A';
					if (movies[i].plot)
						movies[i].plot = movies[i].plot.length > 105 ? movies[i].plot.substring(0, 105) + '[...]' : movies[i].plot;
					movies[i].genres = movies[i].genres ? movies[i].genres.join(' | ') : 'N/A';
					movies[i].rated = movies[i].rated ? movies[i].rated : 'N/A';

					for (var j = 0; j < movies[i].resolutions.length; j++) {
						movies[i].resolutions[j].link = '/player/html5/' + movies[i]._id + '/' + movies[i].resolutions[j].resolution;
						if (j === 0)
							movies[i].defaultLink = '/player/html5/' + movies[i]._id + '/' + movies[i].resolutions[j].resolution;
						if (movies[i].resolutions[j].resolution === 'undefined')
							movies[i].resolutions[j].resolution = 'N/A';
					}


				}

				res.render('search', {
					isApp : true,
					title : 'Hypertube - Search',
					firstname : _.capitalize(user.firstname),
					language : user.language,
					movies : movies
				});
			}, function(err) {
				if (err)
					console.log('Movie search error : ', err);
			});
		} else {
			console.log('User not found or not logged in, redirect to home page');
			res.redirect('/');
		}
	});
};
*/
//module.exports = makeSearch;