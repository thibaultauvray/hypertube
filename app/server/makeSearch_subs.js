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

var subs = function(result) {
	return new Promise ((resolve, reject) => {
		OpenSubtitles.login()
		.then(function (res) {
			OpenSubtitles.search({
				imdbid: result.movie.imdb.id
			}).then(function (data) {
				if (Object.keys(data).length === 0 || (!data.en && !data.fr))
					subtitles = {en : "", fr:""};
				else if (data.en && data.fr)
					subtitles = {en: data.en.url , fr : data.fr.url };
				else if (data.en)
					subtitles = {en: data.en.url , fr : "" };
				else if (data.fr)
					subtitles = {en: "" , fr : data.fr.url };
				path = __dirname + "/../public/subtitles/" + result.torrent.id + "/";
				// console.log(path);
				if (!fs.existsSync(path)){
					fs.mkdirSync(path);
				}
				Object.keys(subtitles).forEach(function(e){
					// console.log(subtitles[e]);
					if (subtitles[e].length != 0) {
						request.get(subtitles[e]).pipe(srt2vtt()).pipe(fs.createWriteStream(path + result.torrent.id + "-" + e + '.vtt'));
					}
				});
				Movie.update({'torrent.id':result.torrent.id}, {$set: {subtitles: subtitles}}, function(err, fuck){
					console.log('err :'+err);
					console.log(fuck);
				});
				console.log(result.movie.title+ ' has subtitles updated');
			});
		});
		resolve(result);
	})
}

module.exports = subs;