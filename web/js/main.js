angular.module('epicBlotto', ['ngRoute', 'ngAnimate', 'toaster', 'ngStorage', 'firebase']);

angular.module('epicBlotto').run(['$timeout', function($timeout) {
    $timeout(function(){
        $('.preloader').fadeOut(300, function(){
            $('.main-content').show();
        });
    }, 50);
}]);

angular.module('epicBlotto').controller('mainViewController', function($rootScope, $q, $log, $scope, $http, pathModel, toaster){


    $scope.layers = [
        {
            url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
            name: 'OSM',
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        },
        {
            url: '/geoportail?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
            name: 'Scan 25',
            attribution: 'IGN'
        },
        {
            url: '/geoportail?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
            name: 'Orthophoto',
            attribution: 'IGN'
        }
    ];

    $scope.currentLayer = $scope.layers[0];
    $scope.showRouteLayer = true;
    $scope.geolocInput = '';

    $scope.selectLayer = function(l) {
        $scope.currentLayer = l;
    };

    $scope.toggleRouteLayer = function() {
        $scope.showRouteLayer = !$scope.showRouteLayer;
    };

    $scope.path = pathModel;

    $scope.getGradientClass = function(gradient) {
        var g = Math.abs(gradient);
        if (g < 5) {
            return 'gradient-none';
        } else if (g < 10) {
            return 'gradient-small';
        } else if (g < 15) {
            return 'gradient-medium';
        } else {
            return 'gradient-hard';

        }
    };

    $scope.zoomStep = function(step) {
        $rootScope.$broadcast('mapZoomStep', step.line);
    };

    $scope.exportPath = function() {
        try {
            var isFileSaverSupported = !!new Blob;
            var blob = new Blob([pathModel.exportKml()], {type: "text/plain;charset=utf-8"});
            saveAs(blob, "path.kml");
        } catch (e) {
            toaster.pop('error', 'Error', 'Browser not supported');

        }
    };

    $scope.geoloc = function() {
        if ($scope.geolocInput) {
            $http.get('http://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent($scope.geolocInput)).success(function(res){
                if (res && res.features && res.features.length > 0) {
                    $rootScope.$broadcast('mapZoomPoint', res.features[0]);
                }
            });

        }
    };



});