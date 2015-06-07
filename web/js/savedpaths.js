angular.module('epicBlotto').controller('savedPathsController', function($scope, $rootScope, $q, $log, $localStorage, pathModel, $firebaseArray) {

    var username = $localStorage.username;
    $scope.showSavedPaths = false;
    $scope.savedPaths = null;

    $scope.loadPath = function() {

        $scope.showSavedPaths = !$scope.showSavedPaths;

        if ($scope.showSavedPaths && !$scope.savedPaths) {
            reloadSavedPathData();
        }
    };

    function prompt(title) {
        var defer = $q.defer();
        var result = window.prompt(title);
        defer.resolve(result);
        return defer.promise;
    }

    function confirm(title) {
        var defer = $q.defer();
        var result = window.confirm(title);
        if (result) defer.resolve();
        else defer.reject();
        return defer.promise;
    }

    function reloadSavedPathData(){

        var buildFirebase = function() {
            if (username) {
                var firebase = new Firebase('https://scorching-torch-8744.firebaseio.com/data/' + encodeURIComponent(username));
                $scope.savedPaths = $firebaseArray(firebase);
                $scope.savedPaths.$loaded().then(function(data){
                    defer.resolve(data);
                }, function(err){
                    $log.error(err);
                    defer.reject(data);
                });
            }
        };

        var defer = $q.defer();
        if (!username) {

            prompt('Votre nom ?').then(function(){
                username = window.prompt('Votre nom d\'utilisateur ?');
                $localStorage.username = username;
                buildFirebase();
            });
        } else {
            buildFirebase();

        }
        return defer.promise;
    }

    $scope.savePath = function() {
        reloadSavedPathData().then(function() {
            return prompt('Nom du parcours ?');
        }).then(function(name){
            console.log(pathModel.steps);
            $scope.savedPaths.$add({
                label: name,
                distance: pathModel.totalDistance,
                steps: pathModel.steps
            });
        });
    };
    $scope.deleteSavedPath = function(p){
        confirm('Voulez-vous supprimer ' + p.label + ' ?').then(function(){
            $scope.savedPaths.$remove(p);
        });
    };

    $scope.loadSavedPath = function(p) {
        pathModel.loadSteps(p.steps);
        $rootScope.$broadcast('mapZoomStep', [pathModel.steps[0].from, pathModel.lastStep().to]);
    };
});
