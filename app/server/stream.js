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

var gen = 0;
var ffmpegHash = {};
var path = '/tmp/tdl/';
var dataHash = {};

var Magnet = require('../schemas/magnet.js');


//TEST
var GrowingFile = require('growing-file');

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

exports.stream = function (req, res, next) {
    var torrentId = req.params.id;
    var already = false;
    console.log(user);
    console.log("Movies = " + req.params.id);
    Movies.findOne({'torrent.id': torrentId}).lean().exec(function (err, movie) {
        console.log(movie);
        Users.findOne({username: req.session.username}, function (err, user) {
            user.history.forEach(function (elem) {
                if (elem.torrent.id == torrentId) {
                    already = true;
                }
                console.log(elem.torrent.id);
            });
            if (!already) {
                console.log("UPDATE");
                Users.update({'username': req.session.username}, {$addToSet: {'history': movie}}, function (err, doc) {
                    console.log(doc);
                    if (err) {
                        // TODO throw err
                    }
                });
            }
        });
        console.log("=============");

        var url_parts = url.parse(req.url, true);
        var magnet = movie.torrent.magnetLink;
        // TODO THROW ERROR WHEN IMDB ID NOT HERE
        // console.log(movie.movie.imdb);
        imdb.getById(movie.movie.imdb.id).then(function (data) {
            res.render('stream', {
                isApp: true,
                title: 'Hypertube - Register',
                magnet: magnet,
                torrentId: torrentId,
                duration: parseInt(data.runtime),
                uri: '/tmp/tdl/Rick_And_Morty_S01E08_HDTV_x264-MiNDTHEGAP_[eztv].mp4'
            });
        });
    });

};


var downloadTorrent = function (movie, magnet, io, res) {
    console.log("==============================");
    if (movie.torrent.path === undefined || movie.torrent.path === null) {
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
                    path: path,
                    tmp: '/tmp/torrent-stream2'
                });
            var movie_file;
            var file_size = 0;
            engine.on('ready', function () {

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
                        path: path + movie_file.path
                    };
                    console.log("PATH UPDATE");
                    console.log("=============");
                    console.log("MOVIE DATA");
                    console.log(movie_data);
                    var mime = validExtension(movie_file.name);
                    io.emit('getExt', mime);
                    // ON ENVOIT REOTUR PROMISE LE FICHIER EN TRAIN DETRE TELECHARGE
                    console.log("MIMEUH" + mime);
                    // fulfill(movie_data);
                    if (original) {
                        // movie_file.createReadStream({start: movie_file.length - 1025, end: movie_file.length - 1});
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
                            // console.log('downloaded ' + piece_index + '(' + engine.swarm.downloaded + '/' + movie_file.length + ')');
                        });
                        engine.on('idle', function () {
                            // FICHIER TELECHARGE
                            fulfill(movie_data);
                            console.log("MIMEEEE");
                            console.log(mime);
                            if (mime == "video/mp4" || mime == "video/webm" || mime == "video/ogg") {
                                // ON SAVE EN BDD SI LISIBLE DIRECTEMENT PAR NAV
                                console.log("Save model");
                                console.log(movie.torrent.id);
                                console.log(movie_data.path);
                                Movies.update({'torrent.id': movie.torrent.id}, {$set: {'torrent.path': movie_data.path}}, function (err, doc) {
                                    console.log(movie_data);
                                    console.log("YOLOOOOOOOOO");
                                    console.log(doc);
                                    console.log(err);
                                })
                            }
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
            io.emit('getExt', validExtension(movie.torrent.path));
            console.log(movie_data);
            fulfill(movie_data);
            // ON ENVOIE LES DONNES DU FICHIER DU SERVER
        }
    });
}


var streamMovie = function (data, query, range_string, res, movie, magnet, io, duration) {
    /*
     DATA.NAME = File name
     Data.lenght = size;
     data . path PAth + file
     */
    console.log("STREAM");
    if (movie.torrent.path === undefined || movie.torrent.path === null) {
        var isdownload = false;
    }
    else {
        var isdownload = true;
    }
    var info = {};
    info.file = data.name;
    info.path = data.path;
    info.size = data.length;
    info.duration = data.duration;
    info.modified = data.date;
    var old = info.path;
    info.old_size = data.length;
    info.mime = validExtension(info.file);
    info.old_mime = info.mime;
    if (info.mime == false) {
        events.emit('badExt', res, io);
        return false;
    }
    console.log("INFO MIME" + info.mime);
    new Promise(function (fill, reje) {
        // CONVERSION SI PAS LISIBLE PAR NAVIGATEUR
        if (info.mime !== "video/mp4" && info.mime !== "video/webm" && info.mime !== "video/ogg" && !isdownload) {
            console.log("CONVERTION");
            console.log(data);
            var key = ++gen;
            info.file = data.name;
            // PATH COMPLET + NOM DU FICHIER '/tmp/tdl/movie.converted.mp4
            var converted_path = data.path + '.converted.mp4';
            // NOM FICHIER movie.converted.mp4
            var converted_file = data.name + '.converted.mp4';
            info.size = data.length;
            if (ffmpegHash[old] === undefined) {
                ffmpegHash[old] = key;
            }
            if (ffmpegHash[old] === key) {
                var interval_id = setInterval(function () {
                    var fails = 0;
                    var busy = false;
                    if (!busy) {
                        busy = true;
                        try {
                            ffmpeg().input(old)
                                .audioCodec('aac')
                                .videoCodec('libx264')
                                .output(converted_path)
                                .on('codecData', function (data) {
                                    clearInterval(interval_id);
                                    console.log("DURATION ====" + data.duration);
                                    console.log(data);
                                    io.emit('getDuration', data.duration);
                                    fill(dataHash[old]);
                                    dataHash[old] = data;
                                })
                                .on("end", function (data) {
                                    Movies.update({'torrent.id': movie.torrent.id}, {$set: {'torrent.path': converted_path}}, function (err, doc) {
                                        console.log("YOLO");
                                        console.log(doc);
                                        console.log(err);
                                    });
                                    })
                                    // .on("progress", function (data) {
                                    //     console.log("PROGRESS");
                                    //     console.log("duration" + duration);
                                    //     console.log("OLD SIZE" + info.old_size);
                                    //     console.log("DATA");
                                    //     var minCon = HHMM(data.timemark);
                                    //     var perCent = (minCon / duration) * 100;
                                    //     console.log("PERCENT" + perCent);
                                    //
                                    //     if (perCent >= 5) {
                                    //         io.emit("convertDone");
                                    //         fill(dataHash[old]);
                                    //     }
                                    //     else
                                    //         io.emit("getPercent", perCent);
                                    //     console.log(data.timemark);
                                    //     console.log(HHMM(data.timemark));
                                    //     console.log("==============");
                                    // })
                                        .on("error", function (err, stdout, stderr) {
                                            console.log("Erreur ffmpeg" + err);
                                            console.log(stdout);
                                            console.log(stderr);
                                            busy = false;
                                            ++fails;
                                        })
                                        .outputFormat('mp4')
                                        .outputOptions('-movflags frag_keyframe+empty_moov')
                                        .run();
                                }
                        catch
                            (exception)
                            {
                                console.log(exception);
                                ++fails;
                                busy = false;
                            }
                            if (fails > 30 && busy === false) {
                                clearInterval(interval_id);
                                reje('fluent-ffmpeg never launched without error');
                            }
                        }
                    }
                    ,
                    3000
                    );
            }
            else {
                // SI DEJA EN TRAIN DETRE CONVERTIS PASSE ANCIENNE DATA
                console.log("OLD");
                console.log(dataHash[old]);
                io.emit('getDuration', dataHash[old].duration);

                fill(dataHash[old]);
            }
            info.file = converted_file;
            info.path = converted_path;
            info.mime = 'video/mp4';
            try {
                info.size = fs.statSync(info.path).size;
            } catch (exception) {
                console.log('Converted movie size not found');
                info.size = 0;
            }
        }
        else {
            console.log('No conversion needed:', info.mime);
            fill(false);
        }
    }).then(function (success) {
            new Promise(function (fulfill, reject) {
                if (movie.torrent.path === undefined || movie.torrent.path === null) {
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
                            if (info.size > 5000000) {
                                // on atend que le fichier soit assez gros pour le stream
                                clearInterval(interval_id);
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
                        console.log("ENVOIE HEADER = " + info.path);
                        var stat = fs.statSync(info.path);
                        var total = stat.size;

                        if (range_string) {
                            console.log("Calcul header a envoyer");
                            // Si fichier convertis
                            if (info.old_mime !== "video/mp4" && info.old_mime !== "video/ogg" && info.old_mime !== "video/webm") {
                                console.log("STREAMING");
                                res.writeHead(200, {
                                    'transferMode.dlna.org': 'Streaming',
                                    'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
                                    "Cache-Control": "private",
                                    "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
                                    'Content-Type': 'video/mp4'
                                });
                                file = GrowingFile.open(info.path);
                                file.pipe(res);
                                return true;
                            }
                            else {
                                console.log("Range requete");
                                info.start = 0;
                                info.end = info.size - 1;
                                console.log(range_string.match(/bytes=(.+)-(.+)?/));
                                if (range_string && (range = range_string.match(/bytes=(.+)-(.+)?/)) !== null) {

                                    info.start = isNumber(range[1]) && range[1] >= 0 && range[1] < info.end ? range[1] - 0 : info.start;
                                    info.end = isNumber(range[2]) && range[2] > info.start && range[2] <= info.end ? range[2] - 0 : info.end;
                                    info.rangeRequest = true;
                                    console.log("INFO RANGE");
                                    console.log(info.start);
                                    console.log(info.end);
                                } else if (query.start || query.end) {
                                    // This is a range request, but doesn't get range headers. So there.
                                    info.start = isNumber(query.start) && query.start >= 0 && query.start < info.end ? query.start - 0 : info.start;
                                    info.end = isNumber(query.end) && query.end > info.start && query.end <= info.end ? query.end - 0 : info.end;
                                }

                                info.length = info.end - info.start + 1;
                                console.log("INFO")
                                console.log(info);
                                var header;
                                header = {
                                    "Cache-Control": "public; max-age=3600",
                                    Connection: "keep-alive",
                                    "Content-Type": info.mime,
                                    "Content-Disposition": "inline; filename=" + info.file + ";",
                                    "Accept-Ranges": "bytes"
                                };
                                header.Status = "206 Partial Content";
                                header["Content-Range"] = "bytes " + info.start + "-" + info.end + "/" + info.size;
                                header.Pragma = "public";
                                header["Content-Transfer-Encoding"] = "binary";
                                header["Content-Length"] = info.length;
                                res.writeHead(206, header);
                                stream = fs.createReadStream(info.path, {flags: "r", start: info.start, end: info.end});
                                res.openedFile = stream;

                                // res.writeHead(206, {
                                //     'Status' : '206 Partial Content',
                                //     'Content-Range' : 'bytes ' + start + '-' + end + '/' + total,
                                //     'Accept-Ranges' : 'bytes',
                                //     "Cache-Control": "private",
                                //     "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
                                //     'Content-Length': chunksize,
                                //     'Content-Type': 'video/mp4'
                                // });
                                stream.pipe(res);
                                res.on('close', function () {
                                    stream = null;
                                    info = null;
                                    console.log('response closed');
                                    if (res.openedFile) {
                                        res.openedFile.unpipe(this);
                                        if (this.openedFile.fd) {
                                            fs.close(this.openedFile.fd);
                                        }
                                    }
                                });

                                return true;
                            }
                        }
                        else {
                            console.log("Entiere video");
                            stream = fs.createReadStream(info.path);
                            res.writeHead(200, {'Content-Length': total, 'Content-Type': 'video/mp4'});
                            stream.pipe(res);
                            return true;

                        }

                        console.log(info.path);
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


//
//
//                 // var stream = movie_file.createReadStream({start: movie_file.length - 1025, end: movie_file.length - 1});
//                 // var proc = ffmpeg(stream)
//                 //     .format('mp4')
//                 //     .flvmeta()
//                 //     .size('320x?')
//                 //     .videoBitrate('512k')
//                 //     .videoCodec('libx264')
//                 //     .fps(24)
//                 //     .audioBitrate('96k')
//                 //     .audioCodec('aac')
//                 //     .audioFrequency(22050)
//                 //     .audioChannels(2)
//                 // // setup event handlers
//                 //     .on('end', function() {
//                 //         console.log('done processing input stream');
//                 //     })
//                 //     .on('error', function(err) {
//                 //         console.log('an error happened: ' + err.message);
//                 //     })
//                 //     // save to file
//                 //     .pipe(stream, {end:true});

}

var setHeaderInfo = function (data, info, res, header) {
    var code = 200;
    var header;
    var stat = fs.statSync(info.path);
    var total = stat.size;

    if (header) {
        var parts = header.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];

        var start = parseInt(partialstart, 10);
        var end = partialend ? parseInt(partialend, 10) : total - 1;

        var chunksize = (end - start) + 1;
        res.writeHead(206, {
            'transferMode.dlna.org': 'Streaming',
            'Content-Range': 'bytes' + start + '-' + end + '/' + total,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4'
        })
    }
    else {
        res.writeHead(200, {'Content-Length': total, 'Content-Type': 'video/mp4'});
    }
    return true;
    // 'Connection':'close',
    // 'Cache-Control':'private',
    // 'Transfer-Encoding':'chunked'

    // if (settings.forceDownload)
    // {
    //     header = {
    //         Expires: 0,
    //         "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
    //         //"Cache-Control": "private",
    //         "Content-Type": info.mime,
    //         "Content-Disposition": "attachment; filename=" + info.file + ";"
    //     };
    // } else
    // {
    //     header = {
    //         "Cache-Control": "public; max-age=" + settings.maxAge,
    //         Connection: "keep-alive",
    //         "Content-Type": info.mime,
    //         "Content-Disposition": "inline; filename=" + info.file + ";",
    //         "Accept-Ranges": "bytes"
    //     };
    //
    //     if (info.rangeRequest)
    //     {
    //         // Partial http response
    //         code = 206;
    //         header.Status = "206 Partial Content";
    //         header["Content-Range"] = "bytes " + info.start + "-" + info.end + "/" + info.size;
    //     }
    // }
    //
    // header.Pragma = "public";
    // header["Last-Modified"] = info.modified.toUTCString();
    // header["Content-Transfer-Encoding"] = "binary";
    // header["Content-Length"] = info.length;
    // if (settings.cors)
    // {
    //     header["Access-Control-Allow-Origin"] = "*";
    //     header["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept";
    // }
    // header.Server = settings.server;
    //
    // res.writeHead(code, header);
}

exports.torrent = function (req, res, next) {
    var io = req.io;
    var torrentId = req.params.torrentId;
    var url_parts = url.parse(req.url, true);
    var magnet = "magnet:" + url_parts.search;
    var duration = req.params.duration;
    console.log("DURATIONNN " + duration);
    var range_string = req.headers.range;
    Movies.findOne({'torrent.id': torrentId}).lean().exec(function (err, movie) {
        // res.on('close', function(){
        //     console.log('response closed');
        //     return false;
        // });
        // Download file
        downloadTorrent(movie, magnet, io, res).then(
            /* Promise fulfill callback */
            function (data) {
                // Neccessary for streaming video
                streamMovie(data, req.query, range_string, res, movie, magnet, io, duration);
            },
            // Error TODO
            function (err) {
                console.log('Callback Error:' + err.message);
                return false;
            }
        );
    })

}

var minTOHHMM = function (min) {
    var h = parseInt(min / 60);
    var min = parseInt(min - (60 * h));
    if (h == 0)
        h = "00";
    if (min.toString().length == 1)
        min = '0' + min;
    return (h + ":" + min + ":00");

}
var HHMM = function (dur) {
    var hms = dur;   // your input string
    var a = hms.split(':'); // split it at the colons

// Hours are worth 60 minutes.
    var minutes = (+a[0]) * 60 + (+a[1]);
    return minutes;
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
    io.emit('error', 'badExt');

    headerError(res, 403);
    res.end("<!DOCTYPE html><html lang=\"en\">" +
        "<head><title>403 Forbidden</title></head>" +
        "<body>" +
        "<h1>Sorry...</h1>" +
        "<p>Cannot stream that movie format.</p>" +
        "</body></html>");
})

