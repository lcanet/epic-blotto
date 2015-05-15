angular.module('epicBlotto').service('epGraph', function ($log) {
    var NODE_DELTA = 0.000001;

    var routeNodesGraph;

    var positionEqual = function(node, latLng) {
        return Math.abs(node.latlng.lat - latLng.lat) < NODE_DELTA &&
            Math.abs(node.latlng.lng - latLng.lng) < NODE_DELTA
    };

    var findOrCreateNode = function(latLng) {
        var node;
        for (var i = 0; i < routeNodesGraph.length; i++) {
            node = routeNodesGraph[i];
            if (positionEqual(node, latLng)) {
                return node;
            }
        }
        node = {
            id: routeNodesGraph.length,
            latlng: latLng,
            next: []
        };
        routeNodesGraph.push(node);
        return node;
    };
    var link = function(node1, node2){
        node1.next.push(node2);
        node2.next.push(node1);
    };

    /**
     * Refresh graph data from a geojson layer object
     * @param routesLayer
     */
    this.feedGraphData = function(routesLayer) {
        routeNodesGraph = [];

        var processLine = function(latlngs) {
            var nodes = _.map(latlngs, findOrCreateNode);
            for (var i = 1; i < nodes.length; i++) {
                link(nodes[i], nodes[i-1]);
            }
        };
        routesLayer.eachLayer(function(line){
            if (line instanceof L.MultiPolyline) {
                _.each(line.getLatLngs(), processLine);
            } else if (line instanceof L.Polyline) {
                processLine(line.getLatLngs());
            }
        });
    };

    var findNearestNode = function(ll) {
        var closest = null, closestDistance = Infinity;
        _.each(routeNodesGraph, function(n){
            var d = ll.distanceTo(n.latlng);
            if (d < closestDistance) {
                closest = n;
                closestDistance = d;
            }
        });
        return closest;
    };

    var pseudoNode = function(ll) {
        return {
            id: -1,
            latlng: ll
        };
    };

    /**
     * Find path from a node to another node
     */
    this.findPath = function(fromLatlng, toLatlng) {
        var start = findNearestNode(fromLatlng);
        var end = findNearestNode(toLatlng);

        if (!start || !end) {
            $log.error('Cannot find any node in graph data');
            return [];
        }

        var queue = [];
        var closedList = {}, openList = {};

        function stepCost(fromNode, node) {
            return fromNode.latlng.distanceTo(node.latlng);
        }

        function heuristic(node) {
            return node.latlng.distanceTo(toLatlng);
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
                console.log('No More nodes');
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
        return path;
    };



});