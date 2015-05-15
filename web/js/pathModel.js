angular.module('epicBlotto').service('pathModel', function(epGraph){

    this.steps = [];
    this.totalDistance = 0;
    this.totalVerticalDifference = 0;

    /**
     *
     * @param fromLatLng
     * @param toLatLng
     * @return {{}}
     */
    this.addStep = function(fromLatLng, toLatLng) {

        var calculatedPath = epGraph.findPath(fromLatLng, toLatLng);

        var step = {};
        step.distance = 0;
        step.verticalDifference = 0;
        step.from = fromLatLng;
        step.to = toLatLng;
        step.line = [];
        step.maxAltitude = 0;

        for (var i = 0; i < calculatedPath.length; i++) {
            var currentPoint = calculatedPath[i].latlng;
            step.line.push(currentPoint);
            step.maxAltitude = Math.max(step.maxAltitude, currentPoint.alt);
            if (i !== 0) {
                var prevPoint = calculatedPath[i-1].latlng;
                step.distance += currentPoint.distanceTo(prevPoint);
                if (currentPoint.alt && currentPoint.alt !== -99 &&
                    prevPoint.alt && prevPoint.alt !== -99) {
                    step.verticalDifference += (currentPoint.alt - prevPoint.alt);
                }
            }
        }

        this.steps.push(step);
        this.totalDistance += step.distance;
        this.totalVerticalDifference += step.verticalDifference;
        return step;

    };

    /**
     *
     */
    this.clearSteps = function(){
        this.steps = [];
        this.totalDistance = 0;
        this.totalVerticalDifference = 0;
    };

});