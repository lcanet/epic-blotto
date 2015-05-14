var pg = require('pg'),
    winston = require('winston'),
    _ = require('lodash'),
    util = require('util');

var pgConnectionString = 'postgres://bdtopo:bdtopo@192.168.0.2/bdtopo';
var rowLimit = 1000;

function transformRows(result) {
    return _.map(result.rows, function(row){
        return {
            type: 'Feature',
            geometry: JSON.parse(row.geom),
            properties: _.omit(row, 'geom')
        };
    });
}

exports.getRoutes = function(minLat, minLon, maxLat, maxLon, callback) {
    var polygon = util.format('POLYGON((%d %d, %d %d, %d %d, %d %d, %d %d))',
        minLon, minLat,
        minLon, maxLat,
        maxLon, maxLat,
        maxLon, minLat,
        minLon, minLat);
    winston.debug('Querying with polygon ' + polygon);

    pg.connect(pgConnectionString, function(err, client, done){
        if (err) {
            return callback(err);
        }
        client.query('select' +
            ' id, prec_plani, prec_alti, nature, numero, nom_rue_g, nom_rue_d, importance, cl_admin, gestion, nom_iti, nb_voies, z_ini, z_fin, ST_AsGeoJson(ST_Transform(the_geom, 4326)) as geom' +
            ' from route' +
            ' where the_geom && ST_Transform(ST_GeomFromText($1, 4326), 2154)' +
            ' limit ' + rowLimit,
            [ polygon ],
            function(err, result){
                done();
                if (err) return callback(err, null);
                return callback(null, transformRows(result))
        });
    });
};