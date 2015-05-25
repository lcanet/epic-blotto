
var express = require('express'),
    http = require('http'),
    winston = require('winston'),
    _ = require('lodash'),
    request = require('request'),
    db = require('./db'),
    graph = require('./graph')
    ;

winston.level = 'debug';

var app = express();

function sendError(res, message) {
    if (_.isObject(message) && message.message) {
        message = message.message;
    }
    winston.error(message);
    res.status(500).send(message || 'Sorry we have an error');
}

app.use('/web', express.static('web'));

app.get('/', function(req, res){
    res.redirect(301, '/web/index.html');
});

app.get('/routes', function(req, res){
    var minLat = parseFloat(req.query.minX);
    var minLon = parseFloat(req.query.minY);
    var maxLat = parseFloat(req.query.maxX);
    var maxLon = parseFloat(req.query.maxY);
    if (!maxLat || !maxLat || !minLat || !minLon) {
        return sendError(res, 'No coordinates provided');
    }

    db.getRoutes(minLat, minLon, maxLat, maxLon, function(err, result){
        if (err) sendError(res, err);
        else res.jsonp(result);
    });
});


app.get('/path', function(req, res){
    var lat1 = parseFloat(req.query.lat1);
    var lon1 = parseFloat(req.query.lon1);
    var lat2 = parseFloat(req.query.lat2);
    var lon2 = parseFloat(req.query.lon2);
    var alt1 = parseFloat(req.query.alt1) || -99;
    var alt2 = parseFloat(req.query.alt2) || -99;
    if (!lat1 || !lon1 || !lat2 || !lon2) {
        return sendError(res, 'No coordinates provided');
    }

    var fromCoordinate = [lon1, lat1, alt1];
    var toCoordinate = [lon2, lat2, alt2];

    graph.findPath(fromCoordinate, toCoordinate, function(err, result){
        if (err) sendError(res, err);
        else res.jsonp(result);
    });
});

app.get('/geoportail', function(req, res){
    var opts = {
        url: 'http://wxs.ign.fr/sjpqaae6rdmdyem05mhp1vmt/geoportail/wmts',
        encoding: null,
        headers: {
            'Referer': 'http://localhost'
        }
    };
    var qs = req.originalUrl;
    var ip = qs.indexOf('?');
    if (ip != -1) {
        opts.url += qs.substring(ip);
    }
    request(opts, function(err, proxyResp, body){
        if (err) {
            return sendError(res, err);
        }
        res.contentType( proxyResp.headers['content-type']);
        res.send(body);
    });

});

var port = process.env.EPIC_BLOTTO_APP_PORT || 18680;
app.listen(port, function(err){
    if (err) {
        winston.error('Cannot bind to port ' + port);
    } else {
        winston.info('Server started on port ' + port);
    }
});
