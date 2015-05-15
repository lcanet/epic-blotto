angular.module('epicBlotto').service('pathModel', function(epGraph, $rootScope){

    this.steps = [];
    this.totalDistance = 0;
    this.totalVerticalDifference = 0;

    var buildStep = function(fromLatLng, toLatLng){

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

        return step;
    };


    /**
     *
     * @param fromLatLng
     * @param toLatLng
     * @return {{}}
     */
    this.addStep = function(fromLatLng, toLatLng) {
        var step = buildStep(fromLatLng, toLatLng);

        this.steps.push(step);
        this.totalDistance += step.distance;
        this.totalVerticalDifference += step.verticalDifference;
        $rootScope.$broadcast('pathModelChanged');
        return step;

    };

    /**
     *
     */
    this.clearSteps = function(){
        this.steps = [];
        this.totalDistance = 0;
        this.totalVerticalDifference = 0;
        $rootScope.$broadcast('pathModelChanged');
    };

    /**
     *
     * @param index
     */
    this.deleteStep = function(index) {
        var step = this.steps[index];
        this.totalDistance -= step.distance;
        this.totalVerticalDifference -= step.verticalDifference;

        if (index !== 0 && index !== this.steps.length - 1) {
            var previousStep = this.steps[index-1];
            var nextStep = this.steps[index+1];

            this.totalDistance -= nextStep.distance;
            this.totalVerticalDifference -= nextStep.verticalDifference;

            var newNextStep = buildStep(previousStep.to, nextStep.to);
            this.steps[index+1] = newNextStep;
            this.totalDistance += newNextStep.distance;
            this.totalVerticalDifference += newNextStep.verticalDifference;

        }
        this.steps.splice(index, 1);

        $rootScope.$broadcast('pathModelChanged');
    };

    /**
     *
     * @return {*}
     */
    this.lastStep = function() {
        return _.last(this.steps);
    };

});