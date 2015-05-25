var db = require('./db'),
    winston = require('winston'),
    geohash  = require('./geohash'),
    _ = require('lodash');

var DEG_TO_RAD = Math.PI / 180;
var BUFFER_FETCH_FACTOR = 0.5;
var index = 0;

function findOrCreateNode(nodesTable, coord) {
    var hash = geohash(coord[1], coord[0]);
    if (nodesTable[hash]) {
        return nodesTable[hash];
    } else {
        var node = {
            id: '' + (index++),
            coordinate: coord,
            next: []
        };
        nodesTable[hash] = node;
        return node;
    }
}

function link(node1, node2){
    node1.next.push(node2);
    node2.next.push(node1);
}

function buildGraph(features) {
    var nodesTable = {};        // keyed by geohash

    var processLine = function(coordinatesLine) {
        var nodes = _.map(coordinatesLine, function(coord){
            return findOrCreateNode(nodesTable, coord);
        });
        for (var i = 1; i < nodes.length; i++) {
            link(nodes[i], nodes[i-1]);
        }
    };
    _.each(features, function(feature){
        if (feature.geometry) {
            if (feature.geometry.type === 'LineString') {
                processLine(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'MultiLineString') {
                _.each(feature.geometry.coordinates, processLine);
            }
        }
    });

    var nodesList = [];
    for (var key in nodesTable) {
        if (nodesTable.hasOwnProperty(key)) {
            nodesList.push(nodesTable[key]);
        }
    }
    return nodesList;
}


function findNearestNode (routesNodeGraph, toCoord) {
    var closest = null, closestDistance = Infinity;
    _.each(routesNodeGraph, function(n){
        var d = distance(n.coordinate, toCoord);
        if (d < closestDistance) {
            closest = n;
            closestDistance = d;
        }
    });
    return closest;
}

function pseudoNode(coord) {
    return {
        id: -1,
        coordinate: coord
    };
}

function distance(coord1, coord2) {
    var R = 6378137, // earth radius in meters
        d2r = DEG_TO_RAD,
        dLat = (coord2[1] - coord1[1]) * d2r,
        dLon = (coord2[0] - coord1[0]) * d2r,
        lat1 = coord1[1] * d2r,
        lat2 = coord2[1] * d2r,
        sin1 = Math.sin(dLat / 2),
        sin2 = Math.sin(dLon / 2);

    var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


function positionEqual(node, latLng) {
    return distance(node.coordinate, latLng) < 1;
}


/**
 * Find path from a node to another node
 */
function calculatePath(routesNodeGraph, fromCoordinate, toCoordinate) {
    var start = findNearestNode(routesNodeGraph, fromCoordinate);
    var end = findNearestNode(routesNodeGraph, toCoordinate);

    if (!start || !end) {
        winston.error('Cannot find any node in graph data');
        return [];
    }

    var queue = [];
    var closedList = {}, openList = {};

    function stepCost(fromNode, node) {
        return distance(fromNode.coordinate, node.coordinate);
    }

    function heuristic(node) {
        return distance(node.coordinate, toCoordinate);
    }

    function makeStep(to, from, fromCost) {
        var step = {
            id: to.id,
            from: from,
            to: to,
            cost: fromCost,
            remains: 0
        };
        if (from && to) {
            step.cost += stepCost(from, to);
        }
        step.remains = heuristic(to);
        step.totalCost = step.cost + step.remains;
        return step;
    }

    var initialStep = makeStep(start, null, 0);
    queue.push(initialStep);
    openList[initialStep.id] = initialStep;

    var cont = true;
    while (cont && queue.length > 0) {

        queue = _.sortBy(queue, function(step){
            return step.totalCost;
        });
        if (queue.length === 0) {
            cont = false;
            winston.error('No More nodes');
            break;
        }
        var current = queue.shift();
        // mark as closed
        delete openList[current.id];
        closedList[current.id] = current;

        if (current.to === end) {
            cont = false;
            break;
        }

        _.each(current.to.next, function(nextNode){
            if (!closedList[nextNode.id]) {
                var nextStep = makeStep(nextNode, current.to, current.cost);
                if (openList[nextNode.id]) {
                    var existingStep = openList[nextNode.id];
                    if (existingStep.totalCost > nextStep.totalCost) {
                        openList[nextNode.id] = nextStep;
                        var idx = queue.indexOf(existingStep);
                        if (idx != -1) {
                            queue.splice(idx, 1);
                        }
                        queue.push(nextStep);
                    }
                } else {
                    openList[nextNode.id] = nextStep;
                    queue.push(nextStep);
                }
            }
        });
    }

    var path = [];
    var lastStep = closedList[end.id];
    if (!lastStep) {
        winston.warn('Cannot find any path to end node');
        // use direct line as a fallback
        path.push(pseudoNode(fromCoordinate));
        path.push(pseudoNode(toCoordinate));

    } else {

        // add endnode-endpoint direct line
        if (!positionEqual(end, toCoordinate)) {
            path.push(pseudoNode(toCoordinate));
        }
        var currentBackStep = lastStep;
        while (currentBackStep) {
            path.push(currentBackStep.to);
            if (currentBackStep.from) {
                currentBackStep = closedList[currentBackStep.from.id];
            } else {
                currentBackStep = null;
            }
        }

        // add first direct line
        if (!positionEqual(start, fromCoordinate)) {
            path.push(pseudoNode(fromCoordinate));
        }
    }
    path.reverse();

    // transform to leaflet objects
    path = _.map(path, function(node){
        return {
            id: node.id,
            coordinate: node.coordinate
        };
    });

    return path;
}


function findPath(fromCoordinate, toCoordinate, callback) {
    var hrstart = process.hrtime();

    var minLat = Math.min(fromCoordinate[1], toCoordinate[1]);
    var minLon = Math.min(fromCoordinate[0], toCoordinate[0]);
    var maxLat = Math.max(fromCoordinate[1], toCoordinate[1]);
    var maxLon = Math.max(fromCoordinate[0], toCoordinate[0]);

    var dLat = BUFFER_FETCH_FACTOR * Math.abs(maxLat - minLat);
    var dLon = BUFFER_FETCH_FACTOR * Math.abs(maxLon - minLon);

    // add some buffer
    minLat -= dLat;
    minLon -= dLon;
    maxLat += dLat;
    maxLon += dLon;

    db.getGeometries(minLat, minLon, maxLat, maxLon, function(err, results){
        if (err) return callback(err);
        var nodes = buildGraph(results);
        var path = calculatePath(nodes, fromCoordinate, toCoordinate);
        var hrend = process.hrtime(hrstart);
        var timeMs = hrend[0] * 1000 + hrend[1]/1000000;

        winston.log('info', 'Find path took %d ms. found %d nodes (graph size %d)',
            timeMs,
            path.length,
            nodes.length
        );
        callback(null, path);

    });
}


exports.findPath = findPath;