var BITS = [16, 8, 4, 2, 1];
var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

var index = 0;

var findOrCreateNode = function(nodesTable, coord) {
    var hash = encodeGeoHash(coord[1], coord[0]);
    if (nodesTable[hash]) {
        return nodesTable[hash];
    } else {
        var node = {
            id: index++,
            coordinate: coord,
            next: []
        };
        nodesTable[hash] = node;
        return node;
    }
};

var link = function(node1, node2){
    node1.next.push(node2);
    node2.next.push(node1);
};

var encodeGeoHash = function(latitude, longitude) {
    var is_even=1;
    var i=0;
    var lat = []; var lon = [];
    var bit=0;
    var ch=0;
    var mid;
    var precision = 12;
    var geohash = "";

    lat[0] = -90.0;  lat[1] = 90.0;
    lon[0] = -180.0; lon[1] = 180.0;

    while (geohash.length < precision) {
        if (is_even) {
            mid = (lon[0] + lon[1]) / 2;
            if (longitude > mid) {
                ch |= BITS[bit];
                lon[0] = mid;
            } else
                lon[1] = mid;
        } else {
            mid = (lat[0] + lat[1]) / 2;
            if (latitude > mid) {
                ch |= BITS[bit];
                lat[0] = mid;
            } else
                lat[1] = mid;
        }

        is_even = !is_even;
        if (bit < 4)
            bit++;
        else {
            geohash += BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }
    return geohash;
};


this.onmessage = function(msg) {

    if (msg.data.type === 'buildgraph') {
        var t0 = performance.now();
        var lines = msg.data.lines;
        var nodesTable = {};

        var processLine = function(coordinatesLine) {
            var nodes =  coordinatesLine.map(function(coord, index){
                return findOrCreateNode(nodesTable, coord);
            });
            for (var i = 1; i < nodes.length; i++) {
                link(nodes[i], nodes[i-1]);
            }
        };
        lines.forEach(processLine);

        var nodesList = [];
        for (var key in nodesTable) {
            if (nodesTable.hasOwnProperty(key)) {
                nodesList.push(nodesTable[key]);
            }
        }
        var t1 = performance.now();
        postMessage({
            result: nodesList,
            time: t1-t0
        });

    }
};

