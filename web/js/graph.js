angular.module('epicBlotto').service('epGraph', function ($log) {

    var routeNodesGraph;
    var buildGraphWorker = new Worker('js/worker/buildGraph.js');
    buildGraphWorker.onmessage = function(e) {
        var res = e.data;
        $log.info('Graph parsing took ' + e.data.time + ' ms');
        routeNodesGraph = e.data.result;
    };


    /**
     * Refresh graph data from a geojson  object
     * @param geojson
     */
    this.feedGraphData = function(geojson) {
        routeNodesGraph = [];
        var lines = [];

        _.each(geojson, function(feature){
            if (feature.type === 'Feature' && feature.geometry){
                if (feature.geometry.type === 'LineString') {
                    lines.push(feature.geometry.coordinates);
                } else if (feature.geometry.type === 'MultiLineString') {
                    lines = lines.concat(feature.geometry.coordinates);
                }
            }
        });
        buildGraphWorker.postMessage({type: 'buildgraph', lines:lines});
    };

    var findNearestNode = function(latlng) {
        var closest = null, closestDistance = Infinity;
        _.each(routeNodesGraph, function(n){
            var d = nodeLatLon(n).distanceTo(latlng);
            if (d < closestDistance) {
                closest = n;
                closestDistance = d;
            }
        });
        return closest;
    };

    var pseudoNode = function(latlng) {
        return {
            id: -1,
            coordinate: [latlng.lng, latlng.lat, latlng.alt]
        };
    };

    var nodeLatLon = function(node) {
        return new L.LatLng(node.coordinate[1], node.coordinate[0], node.coordinate[2]);
    };

    var positionEqual = function(node, latLng) {
        return nodeLatLon(node).distanceTo(latLng) < 1;
    };


    /**
     * Find path from a node to another node
     */
    this.findPath = function(fromLatlng, toLatlng) {
        var t0 = performance.now();
        var start = findNearestNode(fromLatlng);
        var end = findNearestNode(toLatlng);

        if (!start || !end) {
            $log.error('Cannot find any node in graph data');
            return [];
        }

        var queue = [];
        var closedList = {}, openList = {};

        function stepCost(fromNode, node) {
            return nodeLatLon(fromNode).distanceTo(nodeLatLon(node));
        }

        function heuristic(node) {
            return nodeLatLon(node).distanceTo(toLatlng);
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
                $log.error('No More nodes');
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
            $log.warn('Cannot find any path to end node');
            // use direct line as a fallback
            path.push(pseudoNode(toLatlng));
            path.push(pseudoNode(fromLatlng));

        } else {

            // add endnode-endpoint direct line
            if (!positionEqual(end, toLatlng)) {
                path.push(pseudoNode(toLatlng));
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
            if (!positionEqual(start, fromLatlng)) {
                path.push(pseudoNode(fromLatlng));
            }
        }
        path.reverse();

        // transform to leaflet objects
        path = _.map(path, function(node){
            return {
                id: node.id,
                latlng: nodeLatLon(node)
            };
        });

        var t1 = performance.now();
        $log.info('Find path took ' + (t1-t0) + ' ms. found ' + path.length + ' nodes (closed ' + _.keys(closedList).length + ' / ' + routeNodesGraph.length + ')');
        return path;
    };


    this.findClosest = function(latLng, tolerance) {
        var closest = null, closestDistance = Infinity;

        _.each(routeNodesGraph, function(node) {
            var d = latLng.distanceTo(nodeLatLon(node));
            if (d < closestDistance){
                closest = nodeLatLon(node);
                closestDistance = d;
            }
        });

        if (closestDistance < tolerance && closest != null) {
            return closest;
        }
    };


});