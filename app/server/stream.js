var http = require('http');
var fs = require('fs');
var path = require('path');
var imdb = require('imdb-api');
var vidStreamer = require("vid-streamer");
var ffmpeg = require('fluent-ffmpeg');
var promise = require('promise');
var settings = require('./config.json');
var Nightmare = require('nightmare');
var nightmare = new Nightmare();
var url = require('url');

var torrentStream = require('torrent-stream');
var mimeTypes = require('./mine-type.js');

var Movies = require('../movie_schema');
var Users = require('../user_schema');

var event = require('events');
var events = new event.EventEmitter();

var GrowingFile = require('growing-file');


var gen = 0;
var ffmpegHash = {};
var dataHash = {};

var sizeTorrent = [];


//TEST

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

var db = mongoose.connection;

db.on('error', function (err) {
    console.log('DB Connection error : ', err);
});

var compareDate = function (a, b)
{
    if (a.date < b.date)
    {
        return 1;
    }
    else {
        return -1;
    }
}


var engineCount = 0;
var engineHash = {};
var enginePaths = {};

var downloadHeader = function(res, info, data) {
    var code = 200;
    var header;

    // 'Connection':'close',
    // 'Cache-Control':'private',
    // 'Transfer-Encoding':'chunked'

    if (settings.forceDownload) {
        header = {
            Expires: 0,
            "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
            //"Cache-Control": "private",
            "Content-Type": info.mime,
            "Content-Disposition": "attachment; filename=" + info.file + ";"
        };
    } else {
        header = {
            "Cache-Control": "public; max-age=" + settings.maxAge,
            Connection: "keep-alive",
            "Content-Type": info.mime,
            "Content-Disposition": "inline; filename=" + info.file + ";",
            "Accept-Ranges": "bytes"
        };

        if (info.rangeRequest) {
            // Partial http response
            code = 206;
            header.Status = "206 Partial Content";
            header["Content-Range"] = "bytes " + info.start + "-" + info.end + "/" + data.length;
        }
    }

    header.Pragma = "public";
    header["Last-Modified"] = info.modified.toUTCString();
    header["Content-Transfer-Encoding"] = "binary";
    header["Content-Length"] = info.length;
    if(settings.cors){
        header["Access-Control-Allow-Origin"] = "*";
        header["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept";
    }
    header.Server = settings.server;

    res.writeHead(code, header);
};


var downloadTorrent = function (movie, magnet, torrent_path, io, res) {
    console.log("==============================");
    Movies.update({'torrent.id': movie.torrent.id}, {$set: {'torrent.date' : Date.now() }}, function (err, doc) {
        console.log('Size updated');
    });
    if (movie.torrent.isDownload === undefined || movie.torrent.isDownload === false) {
        var isDownload = false;
    }
    else {
        var isDownload = true;
    }
    var old_mime;
    return new Promise(function (fulfill, reject) {

        console.log("PATH MOVIE");
        console.log(movie.torrent.path);

        if (!isDownload) // SI PAS DANS LA BDD DONC PAS SUR LE SERVEUR
        {
            var original = true;
            var engine = torrentStream(magnet,
                {
                    path: torrent_path,
                    tmp: '/tmp/torrent-stream2'
                });
            var movie_file;
            var file_size = 0;
            enginePaths[torrent_path] = enginePaths[torrent_path] ? enginePaths[torrent_path] : 1;
            engineHash[(engine.hashIndex = engineCount++)] = engine;
            engine.on('ready', function () {

                for (var i = 0; i < engine.hashIndex; i++) {
                    if (engineHash[i] && engineHash[i].path === engine.path) {
                        console.log('spiderTorrent Notice: Engine', engine.hashIndex, 'not original: copying engine', i);
                        engineHash[engine.hashIndex] = undefined;
                        engine.destroy();
                        engine = engineHash[i];
                        original = false;
                        // reject('Engine twice');
                        break;
                    }
                }
                engine.files.forEach(function (file) {

                    // ON SELECTIONNE LE PLUS GROS FICHIER AVEC EXTENSION VALABLE
                    if (validExtension(file.name) && file_size < file.length) {
                        file_size = file.length;
                        movie_file = file;
                    }
                });
                if (movie_file) {
                    console.log(movie_file.name);
                    console.log("==============");
                    // If file stream is OK
                    movie_file.select();
                    var movie_data = {
                        name: movie_file.name,
                        length: movie_file.length,
                        date: new Date,
                        path: engine.path + '/' + movie_file.path
                    };
                    console.log(movie_file.length);
                    fulfill(movie_data);
                    Movies.update({'torrent.id': movie.torrent.id}, {$set: {'torrent.path': engine.path + '/' + movie_file.path, 'torrent.size' : movie_file.length}}, function (err, doc) {
                        console.log('Size updated');
                    });

                    console.log("PATH UPDATE");
                    console.log("=============");
                    console.log("MOVIE DATA");
                    console.log(movie_data);
                    var mime = validExtension(movie_file.name);
                    if(res.io.sockets.connected[global.client])
                        res.io.sockets.connected[global.client].emit('getExt', mime);
                    // ON ENVOIT REOTUR PROMISE LE FICHIER EN TRAIN DETRE TELECHARGE
                    console.log("MIMEUH" + mime);
                    // fulfill(movie_data);
                    if (original) {
                        movie_file.createReadStream({start: movie_file.length - 1025, end: movie_file.length - 1});
                        engine.on('download', function (piece_index) {
                            // // ENVOIE POURCENTAGE TELECHARGE
                            // var pourcent = parseInt((engine.swarm.downloaded * 100) / movie_file.length);
                            // console.log(pourcent);
                            // if (mime != "video/mp4" && mime != "video/webm" && mime != "video/ogg") {
                            //     if (pourcent > 5) {
                            //         // console.log("Fill");
                            //         // console.log(movie_data);
                            //         // fulfill(movie_data);
                            //     }
                            // }
                            // else {
                            //     fulfill(movie_data);
                            // }
                            // console.log(pourcent);
                            // io.emit('update', parseInt((engine.swarm.downloaded * 100) / movie_file.length));
                            // console.log(parseInt((engine.swarm.downloaded * 100) / movie_file.length / 2));
                            // res.io.sockets.connected[global.client].emit('progressDL', parseInt((engine.swarm.downloaded * 100) / movie_file.length / 2));
                            console.log('downloaded ' + piece_index + '(' + engine.swarm.downloaded + '/' + movie_file.length + ')');
                        });
                        engine.on('idle', function () {
                            console.log("FINISH");
                                // ON SAVE EN BDD SI LISIBLE DIRECTEMENT PAR NAV
                                console.log(movie.torrent.id);
                                console.log(movie_data.path);
                                Movies.update({'torrent.id': movie.torrent.id}, {$set: {'torrent.isDownload': true}}, function (err, doc) {
                                    console.log(doc);
                                    console.log(err);
                                });
                            // ON SUPPRIMER LECOUTE DU TORRENT
                            engine.removeAllListeners();
                            engine.destroy();
                            // }
                        });
                    }
                }
                else {
                    events.emit('badExt', res, io);
                    return false;
                    // FICHIER NON COMPTAIBLE ENVOIE MESSAGE DERREUR TODO

                }
            });
        }
        else { // ELSE ALREADY DOWNLOAD
            console.log("Already downloaded");
            var size = fs.statSync(movie.torrent.path).size;
            var movie_data = {
                name: movie.torrent.path,
                length: size,
                date: new Date,
                path: movie.torrent.path
            };
            // Update updated_at
            Movies.update({'torrent.id': movie.torrent.id}, {$set: {'torrent.path': movie.torrent.path}}, function (err, doc) {
                console.log(doc);
                console.log(err);
            })
            if(res.io.sockets.connected[global.client])
                res.io.sockets.connected[global.client].emit('getExt', validExtension(movie.torrent.path));
            console.log(movie_data);
            fulfill(movie_data);
            // ON ENVOIE LES DONNES DU FICHIER DU SERVER
        }
    });
}


var streamMovie = function (req, data, query, range_string, res, movie, magnet, io, duration) {
    console.log("STREAM");
    if (movie.torrent.isDownload === undefined || movie.torrent.isDownload === false) {
        var isdownload = false;
    }
    else {
        var isdownload = true;
    }
    var range;
    var info = {};

    info.file = data.name;
    info.path = data.path;
    info.size = data.length;
    info.duration = data.duration;
    info.modified = data.date;
    info.mime = validExtension(info.file);
    if (info.mime == false) {
        events.emit('badExt', res, io);
        return false;
    }
    console.log("INFO MIME" + info.mime);
    new Promise(function (fill, reje) {
            console.log('No conversion needed:', info.mime);
            fill(false);
    }).then(function (success) {
            new Promise(function (fulfill, reject) {
                if (movie.torrent.isDownload === undefined || movie.torrent.isDownload === false) {
                    var isdownload = false;
                }
                else {
                    var isdownload = true;
                }
                if (!isdownload) {
                    // SI PAS DEJA TELECHARGE ON ATTEND QUIL GRANDISSE
                    console.log("Stream");
                    var fails = 0;
                    var interval_id = setInterval(function () {
                        try {
                            info.size = fs.statSync(info.path).size;
                            console.log(info.path + ' size:' + info.size);
                            // if(res.io.sockets.connected[global.client])
                            //     res.io.sockets.connected[global.client].emit('progressDL', parseInt((info.size * 100) / 5000000));
                             if (info.size > 5000000) {
                                // on atend que le fichier soit assez gros pour le stream
                                clearInterval(interval_id);
                                if(res.io.sockets.connected[global.client])
                                    res.io.sockets.connected[global.client].emit("convertDone");
                                fulfill(info.size);
                                return;
                            }
                        } catch (exception) {
                        }
                        ++fails;
                        if (fails > 30) {
                            clearInterval(interval_id);
                            reject('Movie file never grew to at least 5mb');
                            // TODO throw err
                        }
                    }, 2000);
                }
                else {
                    info.size = fs.statSync(info.path).size;
                    fulfill(info.size);
                }
            }).then(
                function (suceed) {
                    console.log("INFO FILE + ");
                    console.log(info);
                    try {
                        if (info.mime !== 'video/x-matroska' || isdownload) {
                            // if (sizeTorrent[params.movie] != undefined)
                            //     total = sizeTorrent[params.movie];

                            //console.log(stat.size);
                            if (req.headers['range']) {
                                info.rangeRequest = false;
                                info.start = 0;
                                info.end = info.size - 1;
                                if (range_string && (range = range_string.match(/bytes=(.+)-(.+)?/)) !== null) {
                                    info.start = isNumber(range[1]) && range[1] >= 0 && range[1] < info.end ? range[1] - 0 : info.start;
                                    info.end = isNumber(range[2]) && range[2] > info.start && range[2] <= info.end ? range[2] - 0 : info.end;
                                    info.rangeRequest = true;
                                } else if (query.start || query.end) {
                                    // This is a range request, but doesn't get range headers. So there.
                                    info.start = isNumber(query.start) && query.start >= 0 && query.start < info.end ? query.start - 0 : info.start;
                                    info.end = isNumber(query.end) && query.end > info.start && query.end <= info.end ? query.end - 0 : info.end;
                                }

                                info.length = info.end - info.start + 1;

                                console.log('spiderStreamer Notice: Header Info:', info);

                                console.log('spiderStreamer Notice: Sending header');
                                downloadHeader(res, info, data);
                                try {
                                    stream = fs.createReadStream(info.path, {
                                        flags: "r",
                                        start: info.start,
                                        end: info.end
                                    });
                                    console.log('spiderStreamer Notice: Piping stream...');
                                    stream.pipe(res);
                                    console.log('spiderStreamer Notice: Pipe set');
                                }
                                catch(exception) {
                                    stream = null;
                                    i = 0;
                                    console.log('spiderStreamer Error:'.red, exception);
                                    console.log('spiderStreamer Notice: Retrying... i:', i);
                                    timer_id = setInterval(function() {
                                        ++i;
                                        if (stream === null) {
                                            if (i === 5) {
                                                clearInterval(timer_id);
                                                console.error('spiderStreamer Error:'.red, 'Could not stream file:', info.path);
                                                /* Can't set headers after they are sent. */
                                                // handler.emit("badFile", res);
                                                return;
                                            }

                                            try {
                                                stream = fs.createReadStream(info.path, { flags: "r", start: info.start, end: info.end });
                                            } catch(exception) {
                                                console.log('spiderStreamer Error:'.red, exception);
                                                console.log('spiderStreamer Notice: Retrying in 3 seconds... i:', i);
                                                stream = null
                                            }
                                            if (stream !== null) {
                                                clearInterval(timer_id);
                                                if (settings.throttle) {
                                                    stream = stream.pipe(new Throttle(settings.throttle));
                                                }
                                                console.log('spiderStreamer Notice: Piping stream...');
                                                stream.pipe(res);
                                                console.log('spiderStreamer Notice: Pipe set');
                                            }
                                        } else if (stream !== null) {
                                            clearInterval(timer_id);
                                        }
                                    }, 3000);
                                }
                            } else {
                                //console.log('ALL: ' + total);
                                res.writeHead(200, {
                                    'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
                                    'Expires': '-1',
                                    'Pragma': 'no-cache',
                                    'Access-Control-Allow-Origin': '*',
                                    'Content-Length': total,
                                    'Content-Type': 'video/x-matroska'
                                });
                                fs.createReadStream(info.path).pipe(res);
                            }
                        }
                        else
                        {
                            if (!isdownload) {
                                console.log("Growing FILEE");
                                res.writeHead(200, {
                                    'transferMode.dlna.org': 'Streaming',
                                    'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
                                    "Cache-Control": "private",
                                    "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
                                    'Content-Type': 'video/mp4'
                                });
                                file = GrowingFile.open(info.path);
                                file.pipe(res);
                            }

                        }
                    }
                    catch (exception) {
                        console.log(exception);

                    }
                },
                function (failure) {
                    console.log("fail 1 = " + failure);
                }
            );
        },
        function (error) {
            console.log("fail 2 " + error);
        }
    );


}



exports.torrent = function (req, res, next) {
    var io = req.io;
    var torrentId = req.params.torrentId;
    var url_parts = url.parse(req.url, true);
    var duration = req.params.duration;
    var torrent_path = '/tmp/tdl/' + torrentId + '/';
    var range_string = req.headers['range'];
    Movies.findOne({'torrent.id': torrentId}).lean().exec(function (err, movie) {
        var magnet = movie.torrent.magnetLink;
        if (movie.torrent.path && movie.torrent.length)
        {
            console.log('spiderTorrent Notice: Movie data found for', movie.title);
            var file_size;
            try {
                file_size = fs.statSync(movie.torrent.path).size;
            } catch(exception) {
                console.log('spiderTorrent Error:'.red, 'Movie size not found');
                file_size = 0;
            }
            console.log('spiderTorrent Notice: Movie size comparison:', file_size, resolution.data.length);
            // if (file_size >= movie.torrent.length && (enginePaths[torrent_path] === 1)) {
            //     /* Does not work: file always final size; poential fix? */
            //     console.log('spiderTorrent Notice: Movie already torrented; streaming:', movie.title, resolution.resolution);
            //     streamMovie(req, {
            //         name: movie.torrent.name,
            //         length: movie.torrent.length,
            //         path: movie.torrent.path
            //     }, req.query, range_string, res, movie, magnet, io, duration);
            //     return true;
            // }
        }

        downloadTorrent(movie, magnet, torrent_path, io, res).then(
            /* Promise fulfill callback */
            function (data) {
                // Neccessary for streaming video
                streamMovie(req, data, req.query, range_string, res, movie, magnet, io, duration);
            },
            // Error TODO
            function (err) {
                console.log('Callback Error:' + err.message);
                return false;
            }
        );
    })

}

var headerError = function (res, code) {
    var header = {'Content-Type': 'text/html'};
    res.writeHead(code, header);

};

var isNumber = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};


// HANDLE ERROR
events.on('badExt', function (res, io) {
    console.log('error Pffff');
    if(res.io.sockets.connected[global.client])
        res.io.sockets.connected[global.client].emit('error', 'badExt');

    headerError(res, 403);
    res.end("<!DOCTYPE html><html lang=\"en\">" +
        "<head><title>403 Forbidden</title></head>" +
        "<body>" +
        "<h1>Sorry...</h1>" +
        "<p>Cannot stream that movie format.</p>" +
        "</body></html>");
})

