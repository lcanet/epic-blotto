angular.module('epicBlotto').service('pathModel', function(epGraph, $rootScope){

    this.steps = [];
    this.totalDistance = 0;
    this.totalVerticalDifference = 0;
    this.totalVerticalPositive = 0;
    this.totalVerticalNegative = 0;

    this.totalGradient = 0;

    var buildStep = function(fromLatLng, toLatLng){

        var calculatedPath = epGraph.findPath(fromLatLng, toLatLng);

        var step = {};
        step.distance = 0;
        step.verticalDifference = 0;
        step.verticalPositive = 0;
        step.verticalNegative = 0;
        step.gradient = 0;
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
                    var diff = (currentPoint.alt - prevPoint.alt);
                    step.verticalDifference += diff;
                    if (diff < 0) {
                        step.verticalNegative += Math.abs(diff);
                    } else {
                        step.verticalPositive += diff;
                    }
                }
            }
        }

        if (step.distance !== 0) {
            step.gradient = 100 * Math.abs(step.verticalDifference / step.distance);
        }

        return step;
    };

    this.updateTotals = function(){
        this.totalDistance = 0;
        this.totalVerticalDifference = 0;
        this.totalGradient = 0;
        this.totalVerticalPositive = 0;
        this.totalVerticalNegative = 0;
        _.each(this.steps, function(step){
            this.totalDistance += step.distance;
            this.totalVerticalDifference += step.verticalDifference;
            this.totalVerticalPositive += step.verticalPositive;
            this.totalVerticalNegative += step.verticalNegative;
        }, this);

        if (this.totalDistance !== 0){
            this.totalGradient = 100 * Math.abs(this.totalVerticalDifference / this.totalDistance);
        }
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
        this.updateTotals();
        $rootScope.$broadcast('pathModelChanged');
        return step;

    };

    /**
     *
     */
    this.clearSteps = function(){
        this.steps = [];
        this.updateTotals();
        $rootScope.$broadcast('pathModelChanged');
    };

    /**
     *
     * @param index
     */
    this.deleteStep = function(index) {
        var step = this.steps[index];

        if (index !== 0 && index !== this.steps.length - 1) {
            var previousStep = this.steps[index-1];
            var nextStep = this.steps[index+1];
            this.steps[index+1] = buildStep(previousStep.to, nextStep.to);

        }
        this.steps.splice(index, 1);
        this.updateTotals();

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