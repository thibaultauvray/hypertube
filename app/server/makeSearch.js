var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Movie = require('../movie_schema'),
	promise = require('promise'),
	search = require('./api/search'),
	omdb = require('omdb'),
	async = require("async"),
	Nightmare = require('nightmare'),
	_ = require('lodash');
const PirateBay = require('thepiratebay');

var omdbSearch = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
	if (!err && user) {
		var movies = [];
		// var tmp = [];	
    	PirateBay.search(req.params.text, {
		  category: 200,    // default - 'all' | 'all', 'audio', 'video', 'xxx', 
		                      //                   'applications', 'games', 'other' 
		                      // 
		                      // You can also use the category number: 
		                      // `/search/0/99/{category_number}` 
		  filter: {
		    verified: false    // default - false | Filter all VIP or trusted torrents 
		  },
		  page: 0,            // default - 0 - 99 
		  orderBy: 'seeds', // default - name, date, size, seeds, leeches 
		  sortBy: 'desc'      // default - desc, asc 
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
		          // tmp.push({movie, torrent});
		          movies.push({movie, torrent});
		        })
		      }  
		      callback(null);
		      })
		    .end()
		  }, function(err) {
		  	//movies = tmp.sort(function(a, b){return a.movie.title-b.movie.title});
		      res.render('search', {
							isApp : true,
							title : 'Hypertube - Search',
							firstname : _.capitalize(user.firstname),
							language : user.language,
							movies : movies.sort(function (a, b) 
										{
										  
										  if (a.movie.title > b.movie.title)
										    return 1;
										  if (a.movie.title < b.movie.title)
										    return -1;
										  // a doit être égale à b
										  return 0;
										})
						});
		  }); 
		})	
		.catch(err => {
	  		console.log(err)
		});
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
