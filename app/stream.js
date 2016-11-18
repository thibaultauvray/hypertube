var http = require('http');
var fs = require('fs');
var path = require('path');
var imdb = require('imdb-api');

var Nightmare = require('nightmare');
var nightmare = new Nightmare();
var express = require('express');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


// torent-stream

var torrentStream = require('torrent-stream');
http.createServer( function(req, res) {
	res.writeHead(200, {'Content-Type': 'video/mp4'});
	var uri =	nightmare
				.viewport(1000, 1000)
    			.useragent("Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36")
  				.goto('https://thepiratebay.org/torrent/9946822/Rick_And_Morty_S01E08_HDTV_x264-MiNDTHEGAP_[eztv]')
  				.wait()
  				.evaluate(function () {
    				return document.querySelector('.download a').href
  				})
  				.then(function (result) {
    				var engine = torrentStream(result, {
						path: '/tmp/tdl'
					});

					engine.on('ready', function() {
    					engine.files.forEach(function(file) {
        				console.log('filename:', file.name);
        				var stream = file.createReadStream();
        				stream.pipe(res);
    					});
					});
  				});
	imdb.get('Naruto').then(function(data) { console.log(data) });
}).listen(3000);
