angular.module('epicBlotto').directive('locationAutocomplete', function ($rootScope, $http) {
    return {
        restrict: 'EA',
        template: '<form class="geoloc-form">' +
        '   <input type="text" class="geoloc-text" ng-enter="" ng-model="geolocInput"/>' +
        '</form>',
        replace: true,
        link: function (scope, elt, attrs) {

            var input = elt.find('input');
            input.autocomplete({
                minLength: 2,
                source: function (req, res) {
                    $http.get('http://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(req.term)).success(function (data) {

                        var result = _.map(data.features, function (feature) {
                            return {
                                label: feature.properties.label +  ' ' + feature.properties.postcode,
                                value: feature
                            }
                        });
                        res(result);
                    });
                },
                select: function (event, ui) {
                    event.preventDefault();
                    if (ui.item.value) {
                        $rootScope.$broadcast('mapZoomPoint', ui.item.value);
                        input.val(ui.item.value.properties.label);
                    }
                }
            });
        }
    };
});