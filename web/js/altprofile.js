angular.module('epicBlotto').directive('altitudeProfile', function($rootScope, pathModel){

    function buildData() {
        var data = [];
        var x = 0;
        var lasty;
        var prev = null;

        _.each(pathModel.steps, function(step){
            _.each(step.line, function(latLng){
                var d = 0;
                if (prev) {
                    d = prev.distanceTo(latLng);
                }
                x += d;
                if (latLng.alt !== -99 && latLng.alt) {
                    data.push({x: x, y: latLng.alt, pos: latLng});
                }
                prev = latLng;
            });
        });
        return data;
    }

    return {
        restrict: 'EA',
        scope: {
            width: '@',
            height: '@'
        },
        replace: true,
        template: '<div class="altitude-profile"></div>',
        link: function(scope, elt, attrs) {

            var margin = {top: 20, right: 10, bottom: 20, left: 30};
            var width = parseInt(attrs.width) - margin.left - margin.right;
            var height = parseInt(attrs.height) - margin.top - margin.bottom;

            var x = d3.scale.linear().range([0, width]);
            var y = d3.scale.linear().range([height, 0]);

            var xAxis = d3.svg.axis().scale(x).orient('bottom');
            var yAxis = d3.svg.axis().scale(y).orient('left');
            var area = d3.svg.area()
                .x(function(d) { return x(d.x); })
                .y0(height)
                .y1(function(d) { return y(d.y); });

            var svg = d3.select(elt[0]).append('svg')
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append('g')
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var lineFunction = d3.svg.line()
                .x(function(d) { return d[0]; })
                .y(function(d) { return d[1]; })
                .interpolate("linear");

            var hoverTimeout = null;

            function zoomToPosition(data, dx) {
                scope.$apply(function(){
                    for (var i = 0; i < (data.length - 1); i++) {
                        if (data[i].x >= dx) {
                            $rootScope.$broadcast('mapZoomStep', [data[i].pos, data[i+1].pos]);
                            break;
                        }
                    }
                });
            }

            function refreshPath() {
                var data = buildData();
                x.domain(d3.extent(data, function(d) { return d.x; }));
                y.domain(d3.extent(data, function(d) { return d.y; }));

                // clear content
                svg.html('');

                svg.append("path")
                    .datum(data)
                    .attr("class", "area")
                    .attr("d", area)
                    .on('mousemove', function(evt, a, b){
                        var mpos = d3.mouse(this);
                        var dx = x.invert(mpos[0]);
                        if (hoverTimeout !== null) {
                            clearTimeout(hoverTimeout);
                        }

                        hoverTimeout = setTimeout(function(){
                            zoomToPosition(data, dx);
                        }, 300);

                        hoverLine1.attr('d', lineFunction([
                            [mpos[0], 0],
                            [mpos[0], height]
                        ]));
                        hoverLine2.attr('d', lineFunction([
                            [0, mpos[1]],
                            [width, mpos[1]]
                        ]));
                    })
                    .on('mouseover', function(){
                        hoverLine1.style('visibility', 'visible');
                        hoverLine2.style('visibility', 'visible');
                    })
                    .on('click', function(){
                        if (hoverTimeout !== null) {
                            clearTimeout(hoverTimeout);
                            hoverTimeout = null;
                        }
                        var mpos = d3.mouse(this);
                        var dx = x.invert(mpos[0]);
                        zoomToPosition(data, dx);
                    })
                    .on('mouseout', function() {
                        hoverLine1.style('visibility', 'hidden');
                        hoverLine2.style('visibility', 'hidden');
                        if (hoverTimeout !== null) {
                            clearTimeout(hoverTimeout);
                            hoverTimeout = null;
                        }
                    });
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);
                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                ;

                var hoverLine1 = svg.append('path')
                    .attr("pointer-events", "none")
                    .attr("stroke", "blue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none");
                var hoverLine2 = svg.append('path')
                    .attr("pointer-events", "none")
                    .attr("stroke", "blue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none");

            }

            scope.$on('pathModelChanged', refreshPath);
        }
    }
});