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

const PirateBay = require('thepiratebay');
const Yts = require('yify-search');

var db = mongoose.connection;

var omdbSearch = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
	if (!err && user) {
		var movies = [];
		var vu = false;
		var i = 0;
		//////////////////////////////
		var recherche = 1;		//variable test pour le choix du moteur de recherche
		/////////////////////////////
		
		var Query_regex = new RegExp(req.params.text,'i');
		
		mongoose.connection.db.dropCollection('tmp', function(err, result) {});
	    ///////////test dans la DB avant tout
	    Movie.find({'movie.title': Query_regex}, function(err, results){
	    	if (results.length > 0) {
	    		
	    		results.forEach(function(result){
	    			var movie = result.movie;
	    			var torrent = result.torrent;
	    			movies.push(movie, torrent, vu);
	    			var film = new Tmp({_id: mongoose.Types.ObjectId(), movie, torrent});
					film.save(function(err) {
					  	// if (err) console.log(err);
					})	
	    		})
	   //  		movies.forEach(function(film){
	   //  			console.log(film);
				// 	user.history.forEach(function(histo){
				// 		console.log(film.torrent);
				// 		if (film.torrent.id == histo.torrent.id){
				// 			film.vu = true
				// 		}
				// 	});
				// });
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
				if (recherche == 2) {
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
					    	var imdb = new Nightmare()
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
									       	var film = new Tmp({_id: mongoose.Types.ObjectId(), movie, torrent});
									        film.save(function(err) {
									          	// if (err) console.log(err);
									        })
									        Movie.findOne({'torrent.id':torrent.id}, function(err, result){
									          	if (!result){
									          		var film = new Movie({_id: mongoose.Types.ObjectId(), movie, torrent});
									          		film.save(function(err){
									          			// if (err) console.log(err);
												    });
									          	}
									        })
									    })
							      	}  
						      	callback(null);
						    })
						    .end()
					  	}, function(err) {
					  		movies.forEach(function(film){
								user.history.forEach(function(histo){
									if (film.torrent.id == histo.torrent.id){
										film.vu = true
									}
								});
							});

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
						results.forEach(function(result){
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
									console.log(torrent);
									var film = new Tmp({_id: mongoose.Types.ObjectId(), movie, torrent});
									movies.push({movie, torrent, vu});
									film.save(function(err) {
									          	// if (err) console.log(err);
									})
									Movie.findOne({'torrent.id':torrent.id}, function(err, result){
								      	if (!result){
									      		var film = new Movie({_id: mongoose.Types.ObjectId(), movie, torrent});
									      		film.save(function(err){
									      			// if (err) console.log(err);
								    		});
									   	}
									})
								})
							})
							
						})
						movies.forEach(function(film){
							user.history.forEach(function(histo){
								if (film.torrent.id == histo.torrent.id){
									film.vu = true
								}
							});
						});
						res.render('search', {
										isApp : true,
										isLibrary : true,
										title : 'Hypertube - Search',
										firstname : _.capitalize(user.firstname),
										language : user.language,
										movies : movies
						
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
