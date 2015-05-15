var NODE_DELTA = 0.000001;

// TODO: use an geohashing algorithm to optimize graph construction (linear instead of quadratic)

var positionEqual = function(node, coord) {
    return Math.abs(node.coordinate[0] - coord[0]) < NODE_DELTA &&
        Math.abs(node.coordinate[1] - coord[1]) < NODE_DELTA
};

var findOrCreateNode = function(routeNodesGraph, coord) {
    var node;
    for (var i = 0; i < routeNodesGraph.length; i++) {
        node = routeNodesGraph[i];
        if (positionEqual(node, coord)) {
            return node;
        }
    }
    node = {
        id: routeNodesGraph.length,
        coordinate: coord,
        next: []
    };
    routeNodesGraph.push(node);
    return node;
};
var link = function(node1, node2){
    node1.next.push(node2);
    node2.next.push(node1);
};


this.onmessage = function(msg) {

    if (msg.data.type === 'buildgraph') {
        var t0 = performance.now();
        var lines = msg.data.lines;
        var routeNodesGraph = [];

        var processLine = function(coordinatesLine) {
            var nodes =  coordinatesLine.map(function(coord){
                return findOrCreateNode(routeNodesGraph, coord);
            });
            for (var i = 1; i < nodes.length; i++) {
                link(nodes[i], nodes[i-1]);
            }
        };
        lines.forEach(processLine);
        var t1 = performance.now();

        postMessage({
            result: routeNodesGraph,
            time: t1-t0
        });

    }
};

