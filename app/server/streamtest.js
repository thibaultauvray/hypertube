var fs = require('fs');
var path = require('path');
var imdb = require('imdb-api');
var vidStreamer = require("vid-streamer");
var ffmpeg = require('fluent-ffmpeg');
var promise = require('promise');
var Nightmare = require('nightmare');
var nightmare = new Nightmare();
var Transcoder = require('stream-transcoder');
var torrentStream = require('torrent-stream');
var mimeTypes = require('./mine-type.js');
var gen = 0;
var ffmpegHash = {};
var path = '/tmp/tdl/';
var dataHash = {};

exports.torrentTest = function(req, res, next)
{
    header = {
        "Cache-Control": "public; max-age=" + 3600,
        Connection:"keep-alive",
        'TransferMode.DLNA.ORG': 'Streaming',
        'Access-Control-Allow-Origin':'*',
        'content-type':'video/mp4',
        "Accept-Ranges": "bytes"
    };
    header.Status = "206 Partial Content";

    res.writeHead(200, header);


    new Transcoder("/tmp/tdl/Finding.Dory.2016.WEB-DLRip.1.46Gb.MegaPeer.avi")
        .maxSize(1920, 1080)
        .videoCodec('libx264')
        .videoBitrate(800 * 1000)
        .fps(25)
        .audioCodec('aac')
        .sampleRate(44100)
        .channels(2)
        .audioBitrate(128 * 1000)
        .format('mp4')
        .on('finish', function() {
            next();
        })
        .stream().pipe(res);

}
