var http = require('http');
var fs = require('fs');
var path = require('path');
var imdb = require('imdb-api');
var vidStreamer = require("vid-streamer");
var ffmpeg = require('fluent-ffmpeg');
var promise = require('promise');
var Nightmare = require('nightmare');
var nightmare = new Nightmare();

var torrentStream = require('torrent-stream');
var mimeTypes = require('./mine-type.js');

var gen = 0;
var ffmpegHash = {};
var path = '/tmp/tdl/';
var dataHash = {};

var getExtension = function (name)
{
    return name.match("\.([^.]*)$")[0];
}

var validExtension = function (name)
{
    var ext = getExtension(name);
    // console.log(ext);
    // console.log(mimeTypes);
    // console.log(mimeTypes[ext]);
    if (ext !== null && mimeTypes[ext] !== undefined)
        return true;
    return false;
}

exports.stream = function (req, res, next)
{
    //console.log(req.session);

    res.render('stream', {
        isApp: false,
        title: 'Hypertube - Register',
        uri: '/tmp/tdl/Rick_And_Morty_S01E08_HDTV_x264-MiNDTHEGAP_[eztv].mp4'
    });
};

exports.torrent = function (req, res, next)
{
    // var engine = torrentStream('magnet:?xt=urn:btih:93293ef1db6d2ccbe298f5605777476e75ad472e&dn=Rick+And+Morty+S01E08+HDTV+x264-MiNDTHEGAP+%5Beztv%5D&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969',
    //     {path: '/tmp/tdl'});
    var engine = torrentStream('magnet:?xt=urn:btih:a9d589dc4810eacb7dc6b0bb68688bb14a98da49&dn=Finding+Dory+%282016%29+WEB-DLRip+%7C+Rus+%28iTunes%29&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969',
        {
            path: path,
            tmp: '/tmp/torrent-stream2'
        });

    var file_size = 0;
    var movie_file;
    var info = {};
    var convert;

    engine.on('ready', function ()
    {
        engine.files.forEach(function (file)
        {
            console.log(file.name);
            // ON SELECTIONNE LE PLUS GROS FICHIER AVEC EXTENSION VALABLE
            if (validExtension(file.name) && file_size < file.length)
            {
                console.log(file.name);
                file_size = file.length;
                movie_file = file;
            }
        });

        engine.on('download', function (index)
        {
            console.log('torrentStream Notice: Engine', engine.hashIndex, 'downloaded piece: Index:', index, '(', engine.swarm.downloaded, '/', movie_file.length, ')');
        });
        engine.on('idle', function ()
        {
            console.log('FInish');
        })
        if (movie_file)
        {
            convert = true;
            if (getExtension(movie_file.name) != '.mp4' && getExtension(movie_file.name) != '.webm')
                convert = false;
            if (convert == true)
            {
                console.log(movie_file.name);
                movie_file.select();
                console.log(movie_file.length)
                console.log(validExtension(movie_file.name));
                var range = req.headers.range;
                var positions = range.replace(/bytes=/, "").split("-");
                var start = parseInt(positions[0], 10);
                var total = movie_file.length;
                var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
                var chunksize = (end - start) + 1;
                console.log("CHUNKSIZE" + chunksize);
                res.writeHead(206, {
                    "Content-Range": "bytes " + start + "-" + end + "/" + total,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunksize,
                    "Content-Type": "video/mp4"
                });


                var stream = movie_file.createReadStream({start: start, end: end});

                stream.pipe(res);
            }
            else
            {
                info.file = movie_file.name;
                info.path = path+movie_file.path;
                var old = info.path;
                new Promise(function (fill, reje)
                {
                    var key = ++gen;
                    info.file = movie_file.name;
                    // PATH COMPLET + NOM DU FICHIER '/tmp/tdl/movie.converted.mp4
                    var converted_path = path+info.file+'.converted.mp4';
                    console.log("CONVERTED FILE " + converted_path);
                    // NOM FICHIER movie.converted.mp$
                    var converted_file = info.file+'.converted.mp4';
                    var fails = 0;
                    info.size = movie_file.length;
                    var busy = false;
                    if (ffmpegHash[old] === undefined) {
                        console.log('fluent-ffmpeg Notice:', key+':', 'Movie not yet converted, competing for key...');
                        ffmpegHash[old] = key;
                    }
                    if (ffmpegHash[old] === key)
                    {
                        var interval_id = setInterval(function ()
                        {
                            if (!busy)
                            {
                                busy = true;

                                try
                                {
                                    var proc = ffmpeg().input(old)
                                        .audioCodec('aac')
                                        .videoCodec('libx264')
                                        .output(converted_path)
                                        .on('codecData', function (data)
                                        {
                                            console.log('fluent-ffmpeg Notice: CodecData:', data);
                                            clearInterval(interval_id);
                                            fill(data);
                                            dataHash[old] = data;
                                        })
                                        .on("error", function (err, stdout, stderr)
                                        {
                                            console.error('spiderStreamer Error:'.red, 'Could not convert file:', info.path);
                                            console.log('fluent-ffmpeg Error:'.red, '\nErr:', err, '\nStdOut:', stdout, '\nStdErr:', stderr);
                                            /* Handle error */
                                            busy = false;
                                            // console.log('spiderStreamer Notice: Giving up: Piping raw stream');
                                            // stream.pipe(res);
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
                        fill(dataHash[old]);
                    }
                    console.log("Converting Loop");
                    info.file = converted_file;
                    info.path = converted_path;
                    info.mime = 'video/mp4';
                }).then(function (success)
                {
                    new Promise(function (fulfill, reject)
                    {
                        console.log("Stream");
                        var fails = 0;
                        var interval_id = setInterval(function ()
                        {
                            try
                            {
                                info.size = fs.statSync(info.path).size;
                                console.log('spiderStreamer Notice:', info.path, ' size:', info.size);
                                if (info.size > 5000000)
                                {
                                    clearInterval(interval_id);
                                    return;
                                }
                                console.log('spiderStreamer Notice: Movie file not yet big enough; fails:', fails);
                            } catch (exception)
                            {
                                console.error('spiderStreamer Error:'.red, exception);
                            }
                            ++fails;
                            if (fails > 30)
                            {
                                clearInterval(interval_id);
                                reject('Movie file never grew to at least 5mb');
                            }
                        }, 2000);

                    }).then(
                        function (suceed)
                        {
                            info.start = 0;
                            info.end = info.size - 1;
                            // range request TODO
                            info.length = info.end - info.start + 1;
                            setHeaderInfo(info, res);
                            try
                            {
                                console.log("TRy Straming");
                                stream = fs.createReadStream(info.path, {flags: "r", start: info.start, end: info.end});
                                stream.pipe(res);
                            }
                            catch (exception)
                            {
                                stream = null;
                                i = 0;
                                timer_id = setInterval(function ()
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
                        function(failure)
                        {
                            console.log("fail 1 = " + failure);
                        }
                    );
                },
                    function(error)
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
                console.log("CONVERT");

            }


        }
        else
        {
            console.log("ERROR");
            // THROW ERR
        }
    });
}

var setHeaderInfo = function (info, res)
{
    var header;
    var code = 200;

    header.Pragma = "public";
    // header["Last-Modified"] = info.modified.toUTCString();
    header["Content-Transfer-Encoding"] = "binary";
    header["Content-Length"] = info.length;
    if (info.rangeRequest)
    {
        // Partial http response
        code = 206;
        header.Status = "206 Partial Content";
        header["Content-Range"] = "bytes " + info.start + "-" + info.end + "/" + info.size;
    }
    res.writeHead(code, header);
}