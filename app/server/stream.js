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

var torrentStream = require('torrent-stream');
var mimeTypes = require('./mine-type.js');

var gen = 0;
var ffmpegHash = {};
var path = '/tmp/tdl/';
var dataHash = {};

var Magnet = require('../schemas/magnet.js');


//TEST
var GrowingFile = require('growing-file');

var getExtension = function (name)
{
    return name.match("\.([^.]*)$")[0];
}

var validExtension = function (name)
{
    var ext = getExtension(name);
    console.log(ext);
    if (ext !== null && mimeTypes[ext] !== undefined)
        return mimeTypes[ext];
    return false;
}

exports.stream = function (req, res, next)
{
    //console.log(req.session);

    res.render('stream', {
        isApp: true,
        title: 'Hypertube - Register',
        uri: '/tmp/tdl/Rick_And_Morty_S01E08_HDTV_x264-MiNDTHEGAP_[eztv].mp4'
    });
};

var engineCount = 0;
var engineHash = {};
var enginePaths = {};

var downloadTorrent = function (isDownload, magnet, io)
{
    return new Promise(function (fulfill, reject)
    {
        if(!isDownload) // SI PAS DANS LA BDD DONC PAS SUR LE SERVEUR
        {
            var original = true;
            var engine = torrentStream(magnet,
                {
                    path: path,
                    tmp: '/tmp/torrent-stream2'
                });
            var movie_file;
            var file_size = 0;
            enginePaths[path] = enginePaths[path] ? enginePaths[path] : 1;
            engineHash[(engine.hashIndex = engineCount++)] = engine;
            console.log('spiderTorrent Notice: Waiting for torrentStream engine')
            engine.on('ready', function ()
            {
                for (var i = 0; i < engine.hashIndex; i++)
                {
                    if (engineHash[i] && engineHash[i].path === engine.path)
                    {
                        engineHash[engine.hashIndex] = undefined;
                        engine.destroy();
                        engine = engineHash[i];
                        original = false;
                        break;
                    }
                }
                engine.files.forEach(function (file)
                {
                    // ON SELECTIONNE LE PLUS GROS FICHIER AVEC EXTENSION VALABLE
                    if (validExtension(file.name) && file_size < file.length)
                    {
                        console.log(file.name);
                        file_size = file.length;
                        movie_file = file;
                    }
                });
                if (movie_file)
                {
                    // If file stream is OK
                    movie_file.select();
                    var movie_data = {
                        name: movie_file.name,
                        length: movie_file.length,
                        date: new Date,
                        path: path + movie_file.path
                    };
                    var mime = validExtension(movie_file.name);
                    io.emit('getExt', mime);
                    // ON ENVOIT REOTUR PROMISE LE FICHIER EN TRAIN DETRE TELECHARGE
                    fulfill(movie_data);
                    if (original)
                    {
                        movie_file.createReadStream({start: movie_file.length - 1025, end: movie_file.length - 1});
                        engine.on('download', function (piece_index)
                        {
                            // ENVOIE POURCENTAGE TELECHARGE
                            io.emit('update', parseInt((engine.swarm.downloaded * 100) / movie_file.length));
                            console.log('torrentStream Notice: Engine', engine.hashIndex, 'downloaded piece: Index:', piece_index, '(', engine.swarm.downloaded, '/', movie_file.length, ')');
                        });
                        engine.on('idle', function ()
                        {
                            // FICHIER TELECHARGE
                            if (mime == "video/mp4" || mime == "video/webm" || mime == "video/ogg")
                            {
                                // ON SAVE EN BDD SI LISIBLE DIRECTEMENT PAR NAV
                                console.log("Save model");
                                // var newMagnet = Magnet(
                                //     {
                                //         url: magnet,
                                //         path: movie_data.path,
                                //         name: movie_file.name
                                //     });
                                // newMagnet.save(function (err)
                                // {
                                //     console.log(err);
                                // });
                            }
                            // ON SUPPRIMER LECOUTE DU TORRENT
                            engine.removeAllListeners();
                            engine.destroy();
                            // }
                        });
                    }
                }
                else
                {
                    // FICHIER NON COMPTAIBLE ENVOIE MESSAGE DERREUR TODO
                }
            });
        }
        else { // ELSE ALREADY DOWNLOAD
            console.log("Already downloaded");
            var size = fs.statSync(isDownload.path).size;
            var movie_data = {
                name: isDownload.name,
                length: size,
                date: new Date,
                path: isDownload.path
            };
            io.emit('getExt', validExtension(isDownload.path));

            fulfill(movie_data);
            // ON ENVOIE LES DONNES DU FICHIER DU SERVER
        }
    });
}


var streamMovie = function (data, query, range_string, res, isdownload, magnet, io)
{
    /*
     DATA.NAME = File name
     Data.lenght = size;
     data . path PAth + file
     */
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
    if (info.mime == false)
    {
        // SI FICHIER NON COMPATIBLE ENVOIE ERROR TODO
        return false;
    }
    console.log("INFO MIME" + info.mime);
    new Promise(function (fill, reje)
    {
        // CONVERSION SI PAS LISIBLE PAR NAVIGATEUR
        if (info.mime !== "video/mp4" && info.mime !== "video/webm" && info.mime !== "video/ogg" && !isdownload)
        {
            console.log("CONVERTION");
            console.log(data);
            var key = ++gen;
            info.file = data.name;
            // PATH COMPLET + NOM DU FICHIER '/tmp/tdl/movie.converted.mp4
            var converted_path = data.path + '.converted.mp4';
            // NOM FICHIER movie.converted.mp4
            var converted_file = data.name + '.converted.mp4';
            info.size = data.length;
            if (ffmpegHash[old] === undefined)
            {
                ffmpegHash[old] = key;
            }
            if (ffmpegHash[old] === key)
            {
                var interval_id = setInterval(function ()
                {
                    var fails = 0;
                    var busy = false;
                    if (!busy)
                    {
                        busy = true;
                        try
                        {
                            ffmpeg().input(old)
                                .audioCodec('aac')
                                .videoCodec('libx264')
                                .output(converted_path)
                                .on('codecData', function (data)
                                {
                                    clearInterval(interval_id);
                                    io.emit('getDuration', data.duration);
                                    fill(data);
                                    dataHash[old] = data;
                                })
                                .on("end", function (data)
                                {
                                    // SI FICHIER CONVERTI ENTIEREMENT ENREGISTREMENT BDD
                                    // fs.createReadStream(converted_path).pipe(fs.createWriteStream(converted_path + '.finished.mp4'));
                                    // var newMagnet = Magnet(
                                    //     {
                                    //         url: magnet,
                                    //         path: info.path,
                                    //         name: info.file
                                    //     });
                                    // newMagnet.save(function (err)
                                    // {
                                    //     console.log(err);
                                    // });
                                })
                                .on("error", function (err, stdout, stderr)
                                {
                                    console.error('spiderStreamer Error:'.red, 'Could not convert file:', info.path);
                                    console.log('fluent-ffmpeg Error:'.red, '\nErr:', err, '\nStdOut:', stdout, '\nStdErr:', stderr);
                                    busy = false;
                                    ++fails;
                                })
                                .outputFormat('mp4')
                                .outputOptions('-movflags frag_keyframe+empty_moov')
                                .run();
                        }
                        catch (exception)
                        {
                            console.log(exception);
                            ++fails;
                            busy = false;
                        }
                        if (fails > 30 && busy === false)
                        {
                            clearInterval(interval_id);
                            reje('fluent-ffmpeg never launched without error');
                        }
                    }
                }, 3000);
            }
            else
            {
                // SI DEJA EN TRAIN DETRE CONVERTIS PASSE ANCIENNE DATA
                console.log("OLD");
               console.log(dataHash[old]);
                io.emit('getDuration', dataHash[old].duration);

                fill(dataHash[old]);
            }
            info.file = converted_file;
            info.path = converted_path;
            info.mime = 'video/mp4';
            try
            {
                info.size = fs.statSync(info.path).size;
            } catch (exception)
            {
                console.log('Converted movie size not found');
                info.size = 0;
            }
        }
        else
        {
            console.log('No conversion needed:', info.mime);
            fill(false);
        }
    }).then(function (success)
        {
            new Promise(function (fulfill, reject)
            {
                if(!isdownload)
                {
                    // SI PAS DEJA TELECHARGE ON ATTEND QUIL GRANDISSE
                    console.log("Stream");
                    var fails = 0;
                    var interval_id = setInterval(function ()
                    {
                        try
                        {
                            info.size = fs.statSync(info.path).size;
                            console.log(info.path + ' size:' + info.size);
                            if (info.size > 5000000)
                            {
                                // on atend que le fichier soit assez gros pour le stream
                                clearInterval(interval_id);
                                fulfill(info.size);
                                return;
                            }
                        } catch (exception)
                        {
                        }
                        ++fails;
                        if (fails > 30)
                        {
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
                function (suceed)
                {
                    console.log("INFO FILE + ");
                    console.log(info);
                    try
                    {
                        console.log("ENVOIE HEADER = " + info.path);
                        var stat = fs.statSync(info.path);
                        var total = stat.size;

                        if (range_string)
                        {
                            console.log("Calcul header a envoyer");
                            if (info.old_mime !== "video/mp4" && info.old_mime !== "video/webm" && info.old_mime !== "video/ogg")
                            {
                                res.writeHead(200, {
                                    'transferMode.dlna.org': 'Streaming',
                                    'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
                                    // 'Content-Range' : 'bytes ' + start + '-' + end + '/' + total,
                                    // 'Accept-Ranges' : 'bytes',
                                    "Cache-Control": "private",
                                    "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
                                    // 'Content-Length': total,
                                    'Content-Type': 'video/mp4'
                                });
                                file = GrowingFile.open(info.path);
                                file.pipe(res);
                            }
                            else
                            {
                                console.log("Range requete");
                                var parts = range_string.replace(/bytes=/, "").split("-");
                                var partialstart = parts[0];
                                var partialend = parts[1];

                                var start = parseInt(partialstart, 10);
                                var end = partialend ? parseInt(partialend, 10) : total - 1;

                                var chunksize = (end - start) + 1;
                                console.log(parts + " - " + end);
                                stream = fs.createReadStream(info.path, { flags : "r", start: start, end: end});

                                res.writeHead(206, {
                                    'Status' : '206 Partial Content',
                                    'Content-Range' : 'bytes ' + start + '-' + end + '/' + total,
                                    'Accept-Ranges' : 'bytes',
                                    "Cache-Control": "private",
                                    "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
                                    'Content-Length': chunksize,
                                    'Content-Type': 'video/mp4'
                                });
                                stream.pipe(res);
                            }
                        }
                        else {
                            console.log("Entiere video");
                            res.writeHead(200, {'Content-Length' : total, 'Content-Type' : 'video/mp4'});
                        }

                        console.log(info.path);
                    }
                    catch (exception)
                    {
                        stream = null;
                        i = 0;
                        var timer_id = setInterval(function ()
                        {
                            ++i;
                            if (stream === null)
                            {
                                if (i === 5)
                                {
                                    clearInterval(timer_id);
                                    console.error('spiderStreamer Error:'.red, 'Could not stream file:', info.path);
                                    /* Can't set headers after they are sent. */
                                    // handler.emit("badFile", res);
                                    return;
                                }

                                try
                                {
                                    stream = fs.createReadStream(info.path, {
                                        flags: "r",
                                        start: info.start,
                                        end: info.end
                                    });
                                } catch (exception)
                                {
                                    console.log('spiderStreamer Error:'.red, exception);
                                    console.log('spiderStreamer Notice: Retrying in 3 seconds... i:', i);
                                    stream = null
                                }
                                if (stream !== null)
                                {
                                    clearInterval(timer_id);
                                    console.log('spiderStreamer Notice: Piping stream...');
                                    stream.pipe(res);
                                    console.log('spiderStreamer Notice: Pipe set');
                                }
                            } else if (stream !== null)
                            {
                                clearInterval(timer_id);
                            }
                        }, 3000);
                    }
                },
                function (failure)
                {
                    console.log("fail 1 = " + failure);
                }
            );
        },
        function (error)
        {
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

var setHeaderInfo = function (data, info, res, header)
{
    var code = 200;
    var header;
    var stat = fs.statSync(info.path);
    var total = stat.size;

    if (header)
    {
        var parts = header.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];

        var start = parseInt(partialstart, 10);
        var end = partialend ? parseInt(partialend, 10) : total - 1;

        var chunksize = (end - start)+1;
        res.writeHead(206, {
            'transferMode.dlna.org': 'Streaming',
            'Content-Range' : 'bytes' + start + '-' + end + '/' + total,
            'Accept-Ranges' : 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4'
        })
    }
    else {
        res.writeHead(200, {'Content-Length' : total, 'Content-Type' : 'video/mp4'});
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

exports.torrent = function (req, res, next)
{
    var io = req.io;
    var range_string = req.headers['range'];
    // MP4
    var magnet = "magnet:?xt=urn:btih:93293ef1db6d2ccbe298f5605777476e75ad472e&dn=Rick+And+Morty+S01E08+HDTV+x264-MiNDTHEGAP+%5Beztv%5D&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969";
    // AVI
    // var magnet = "magnet:?xt=urn:btih:a9d589dc4810eacb7dc6b0bb68688bb14a98da49&dn=Finding+Dory+%282016%29+WEB-DLRip+%7C+Rus+%28iTunes%29&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969";
    // MKV
    // var magnet = "magnet:?xt=urn:btih:5855c0f4de84e4037bacb70f4b72c0206740ab26&dn=Modern.Family.S08E06.PROPER.HDTV.x264-KILLERS%5Bettv%5D&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969";
    Magnet.findOne({url: magnet}, function (err, obj)
    {
        // Download file
        downloadTorrent(obj, magnet, io).then(
            /* Promise fulfill callback */
            function (data)
            {
                // Neccessary for streaming video
                streamMovie(data, req.query, range_string, res, obj, magnet, io);
            },
            // Error TODO
            function (err)
            {
                console.log('spiderTorrent Error:'.red, err.message);
                return false;
            }
        );
    })

//     engine.on('ready', function ()
//     {
//         engine.files.forEach(function (file)
//         {
//             console.log(file.name);
//             // ON SELECTIONNE LE PLUS GROS FICHIER AVEC EXTENSION VALABLE
//             if (validExtension(file.name) && file_size < file.length)
//             {
//                 console.log(file.name);
//                 file_size = file.length;
//                 movie_file = file;
//             }
//         });
//
//         engine.on('download', function (index)
//         {
//             console.log('torrentStream Notice: Engine', engine.hashIndex, 'downloaded piece: Index:', index, '(', engine.swarm.downloaded, '/', movie_file.length, ')');
//         });
//         engine.on('idle', function ()
//         {
//             console.log('FInish');
//         })
//         if (movie_file)
//         {
//             convert = true;
//             if (getExtension(movie_file.name) != '.mp4' && getExtension(movie_file.name) != '.webm')
//                 convert = false;
//             if (convert == true)
//             {
//                 console.log(movie_file.name);
//                 movie_file.select();
//                 console.log(movie_file.length)
//                 console.log(validExtension(movie_file.name));
//                 var range = req.headers.range;
//                 var positions = range.replace(/bytes=/, "").split("-");
//                 var start = parseInt(positions[0], 10);
//                 var total = movie_file.length;
//                 var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
//                 var chunksize = (end - start) + 1;
//                 console.log("CHUNKSIZE" + chunksize);
//                 res.writeHead(206, {
//                     "Content-Range": "bytes " + start + "-" + end + "/" + total,
//                     "Accept-Ranges": "bytes",
//                     "Content-Length": chunksize,
//                     "Content-Type": "video/mp4"
//                 });
//
//
//                 var stream = movie_file.createReadStream({start: start, end: end});
//
//                 stream.pipe(res);
//             }
//             else
//             {
//                 engine.on('download', function (index)
//                 {
//                     console.log('torrentStream Notice: Engine', engine.hashIndex, 'downloaded piece: Index:', index, '(', engine.swarm.downloaded, '/', movie_file.length, ')');
//                 });
//                 info.file = movie_file.name;
//                 info.path = path+movie_file.path;
//                 var old = info.path;
//                 new Promise(function (fill, reje)
//                 {
//                     var key = ++gen;
//                     info.file = movie_file.name;
//                     // PATH COMPLET + NOM DU FICHIER '/tmp/tdl/movie.converted.mp4
//                     var converted_path = path+info.file+'.converted.mp4';
//                     console.log("CONVERTED FILE " + converted_path);
//                     // NOM FICHIER movie.converted.mp$
//                     var converted_file = info.file+'.converted.mp4';
//                     var fails = 0;
//                     info.size = movie_file.length;
//                     var busy = false;
//                     if (ffmpegHash[old] === undefined) {
//                         console.log('fluent-ffmpeg Notice:', key+':', 'Movie not yet converted, competing for key...');
//                         ffmpegHash[old] = key;
//                     }
//                     if (ffmpegHash[old] === key)
//                     {
//                         var interval_id = setInterval(function ()
//                         {
//                             if (!busy)
//                             {
//                                 busy = true;
//
//                                 try
//                                 {
//                                     var proc = ffmpeg().input(old)
//                                         .audioCodec('aac')
//                                         .videoCodec('libx264')
//                                         .output(converted_path)
//                                         .on('codecData', function (data)
//                                         {
//                                             console.log('fluent-ffmpeg Notice: CodecData:', data);
//                                             clearInterval(interval_id);
//                                             fill(data);
//                                             dataHash[old] = data;
//                                         })
//                                         .on("error", function (err, stdout, stderr)
//                                         {
//                                             console.error('spiderStreamer Error:'.red, 'Could not convert file:', info.path);
//                                             console.log('fluent-ffmpeg Error:'.red, '\nErr:', err, '\nStdOut:', stdout, '\nStdErr:', stderr);
//                                             /* Handle error */
//                                             busy = false;
//                                             // console.log('spiderStreamer Notice: Giving up: Piping raw stream');
//                                             // stream.pipe(res);
//                                         })
//                                         .outputFormat('mp4')
//                                         .outputOptions('-movflags frag_keyframe+empty_moov')
//                                         .run();
//                                 }
//                                 catch (exception)
//                                 {
//                                     console.log(exception);
//                                     ++fails;
//                                     busy = false;
//                                 }
//                                 if (fails > 30 && busy === false)
//                                 {
//                                     clearInterval(interval_id);
//                                     reje('fluent-ffmpeg never launched without error');
//                                 }
//                             }
//                         }, 3000);
//                     }
//                     else
//                     {
//                         fill(dataHash[old]);
//                     }
//                     console.log("Converting Loop");
//                     info.file = converted_file;
//                     info.path = converted_path;
//                     info.mime = 'video/mp4';
//                 }).then(function (success)
//                 {
//                     new Promise(function (fulfill, reject)
//                     {
//                         console.log("Stream");
//                         var fails = 0;
//                         var interval_id = setInterval(function ()
//                         {
//                             try
//                             {
//                                 info.size = fs.statSync(info.path).size;
//                                 console.log('spiderStreamer Notice:', info.path, ' size:', info.size);
//                                 if (info.size > 5000000)
//                                 {
//                                     clearInterval(interval_id);
//                                     fulfill(info.size);
//                                     return;
//                                 }
//                                 console.log('spiderStreamer Notice: Movie file not yet big enough; fails:', fails);
//                             } catch (exception)
//                             {
//                                 console.error('spiderStreamer Error:'.red, exception);
//                             }
//                             ++fails;
//                             if (fails > 30)
//                             {
//                                 clearInterval(interval_id);
//                                 reject('Movie file never grew to at least 5mb');
//                             }
//                         }, 2000);
//
//                     }).then(
//                         function (suceed)
//                         {
//                             info.rangeRequest = false;
//                             info.start = 0;
//                             info.end = info.size - 1;
//                             if (range_string && (range = range_string.match(/bytes=(.+)-(.+)?/)) !== null) {
//                                 info.start = isNumber(range[1]) && range[1] >= 0 && range[1] < info.end ? range[1] - 0 : info.start;
//                                 info.end = isNumber(range[2]) && range[2] > info.start && range[2] <= info.end ? range[2] - 0 : info.end;
//                                 info.rangeRequest = true;
//                                 console.log("Request partiel");
//                             } else if (req.query.start || req.query.end) {
//                                 // This is a range request, but doesn't get range headers. So there.
//                                 info.start = isNumber(req.query.start) && req.query.start >= 0 && req.query.start < info.end ? req.query.start - 0 : info.start;
//                                 info.end = isNumber(req.query.end) && req.query.end > info.start && req.query.end <= info.end ? req.query.end - 0 : info.end;
//                             }
//                             // range request TODO
//                             info.length = info.end - info.start + 1;
//                             setHeaderInfo(info, res);
//                             try
//                             {
//                                 console.log("TRy Straming, PATH" + info.path);
//                                 stream = fs.createReadStream(info.path, {flags: "r", start: info.start, end: info.end});
//                                 stream.pipe(res);
//                             }
//                             catch (exception)
//                             {
//                                 stream = null;
//                                 i = 0;
//                                 var timer_id = setInterval(function ()
//                                 {
//                                     ++i;
//                                     if (stream === null)
//                                     {
//                                         if (i === 5)
//                                         {
//                                             clearInterval(timer_id);
//                                             console.error('spiderStreamer Error:'.red, 'Could not stream file:', info.path);
//                                             /* Can't set headers after they are sent. */
//                                             // handler.emit("badFile", res);
//                                             return;
//                                         }
//
//                                         try
//                                         {
//                                             stream = fs.createReadStream(info.path, {
//                                                 flags: "r",
//                                                 start: info.start,
//                                                 end: info.end
//                                             });
//                                         } catch (exception)
//                                         {
//                                             console.log('spiderStreamer Error:'.red, exception);
//                                             console.log('spiderStreamer Notice: Retrying in 3 seconds... i:', i);
//                                             stream = null
//                                         }
//                                         if (stream !== null)
//                                         {
//                                             clearInterval(timer_id);
//                                             console.log('spiderStreamer Notice: Piping stream...');
//                                             stream.pipe(res);
//                                             console.log('spiderStreamer Notice: Pipe set');
//                                         }
//                                     } else if (stream !== null)
//                                     {
//                                         clearInterval(timer_id);
//                                     }
//                                 }, 3000);
//                             }
//                         },
//                         function(failure)
//                         {
//                             console.log("fail 1 = " + failure);
//                         }
//                     );
//                 },
//                     function(error)
//                     {
//                         console.log("fail 2 " + error);
//                     }
//                 );
//
//
// //
// //
// //                 // var stream = movie_file.createReadStream({start: movie_file.length - 1025, end: movie_file.length - 1});
// //                 // var proc = ffmpeg(stream)
// //                 //     .format('mp4')
// //                 //     .flvmeta()
// //                 //     .size('320x?')
// //                 //     .videoBitrate('512k')
// //                 //     .videoCodec('libx264')
// //                 //     .fps(24)
// //                 //     .audioBitrate('96k')
// //                 //     .audioCodec('aac')
// //                 //     .audioFrequency(22050)
// //                 //     .audioChannels(2)
// //                 // // setup event handlers
// //                 //     .on('end', function() {
// //                 //         console.log('done processing input stream');
// //                 //     })
// //                 //     .on('error', function(err) {
// //                 //         console.log('an error happened: ' + err.message);
// //                 //     })
// //                 //     // save to file
// //                 //     .pipe(stream, {end:true});
//                 console.log("CONVERT");
//
//             }
//
//
//         }
//         else
//         {
//             console.log("ERROR");
//             // THROW ERR
//         }
//     });
}

