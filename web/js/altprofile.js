angular.module('epicBlotto').directive('altitudeProfile', function(pathModel){

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
                    data.push({x: x, y: latLng.alt});
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

            function refreshPath() {
                var data = buildData();
                x.domain(d3.extent(data, function(d) { return d.x; }));
                y.domain(d3.extent(data, function(d) { return d.y; }));

                svg.html('');

                svg.append("path")
                    .datum(data)
                    .attr("class", "area")
                    .attr("d", area);
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);
                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                ;

            }

            scope.$on('pathModelChanged', refreshPath);
        }
    }
});