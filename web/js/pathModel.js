angular.module('epicBlotto').service('pathModel', function($http, $q, $rootScope){

    this.steps = [];
    this.totalDistance = 0;
    this.totalVerticalDifference = 0;
    this.totalVerticalPositive = 0;
    this.totalVerticalNegative = 0;

    this.totalGradient = 0;

    var buildStep = function(fromLatLng, toLatLng){
        return $http.get('/path?lat1=' + fromLatLng.lat + '&lon1=' + fromLatLng.lng + '&lat2=' + toLatLng.lat + '&lon2=' + toLatLng.lng).then(function(res){
            var calculatedPath = res.data;
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
            step.cumulatedDistance = 0;

            var prevPointWithAlt = null;

            for (var i = 0; i < calculatedPath.length; i++) {
                // add a latlng
                var coord = calculatedPath[i].coordinate;
                calculatedPath[i].latlng = new L.LatLng(coord[1], coord[0], coord[2]);

                var currentPoint = calculatedPath[i].latlng;
                step.line.push(currentPoint);
                step.maxAltitude = Math.max(step.maxAltitude, currentPoint.alt);
                if (i !== 0) {
                    var prevPoint = calculatedPath[i - 1].latlng;
                    step.distance += currentPoint.distanceTo(prevPoint);
                }
                if (currentPoint.alt && currentPoint.alt !== -99) {
                    if (prevPointWithAlt !== null) {
                        var diff = (currentPoint.alt - prevPointWithAlt.alt);
                        step.verticalDifference += diff;
                        if (diff < 0) {
                            step.verticalNegative += Math.abs(diff);
                        } else {
                            step.verticalPositive += diff;
                        }
                    }
                    prevPointWithAlt = currentPoint;
                }
            }

            if (step.distance !== 0) {
                step.gradient = 100 * Math.abs(step.verticalDifference / step.distance);
            }

            return step;
        });

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
            step.cumulatedDistance = this.totalDistance;
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
        buildStep(fromLatLng, toLatLng).then(_.bind(function(step){
            this.steps.push(step);
            this.updateTotals();
            $rootScope.$broadcast('pathModelChanged');
            return step;
        }, this));
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

        var defer = $q.defer();

        if (index !== 0 && index !== this.steps.length - 1) {
            var previousStep = this.steps[index-1];
            var nextStep = this.steps[index+1];
            buildStep(previousStep.to, nextStep.to).then(_.bind(function(step){
                this.steps[index+1] = step;
                defer.resolve();
            }, this));
        } else {
            defer.resolve();
        }

        defer.promise.then(_.bind(function(){
            this.steps.splice(index, 1);
            this.updateTotals();
            $rootScope.$broadcast('pathModelChanged');
        }, this));
    };

    /**
     *
     * @return {*}
     */
    this.lastStep = function() {
        return _.last(this.steps);
    };

    /**
     * Reload all steps
     * @param steps
     */
    this.loadSteps = function(steps) {
        var toLatLng = function(obj) {
            return new L.LatLng(obj.lat, obj.lng, obj.alt);
        };
        this.steps = _.map(steps, function(origStep){
            var step = _.extend({}, origStep);
            // rebuild leaflet LatLng
            step.from = toLatLng(step.from);
            step.to = toLatLng(step.to);
            step.line = _.map(step.line, toLatLng);
            return step;
        });
        this.updateTotals();
        $rootScope.$broadcast('pathModelChanged');
    };

    /**
     *
     */
    this.exportKml = function(){
        var str = '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:kml="http://www.opengis.net/kml/2.2">\n';
        str += '<Document>';
        str += '<Style id="styleRef">';
        str += '<LineStyle><color>cc0000ff</color><width>4</width></LineStyle>';
        str += '</Style>';
        str += '<Placemark>';
        str += '<styleUrl>#styleRef</styleUrl>';
        str += '<LineString>';
        str += '<tesselate>1</tesselate>';
        str += '<coordinates>';
        _.each(this.steps, function(step){
            _.each(step.line, function(ll){
                str += ll.lng;
                str += ',';
                str += ll.lat;
                str += ',0 ';
            });
        });
        str += '</coordinates>';
        str += '</LineString>';
        str += '</Placemark>';
        str += '</Document>';
        str += '</kml>';
        return str;
    };
});