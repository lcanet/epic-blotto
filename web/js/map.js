angular.module('epicBlotto').directive('mapView', function($rootScope, $http, $log, toaster, epGraph, pathModel){

    function styleFeature(feature) {
        switch (feature.properties.nature) {
            case 'Autoroute':
            case 'Quasi-autoroute':
                return {
                    color: '#FC0C22',
                    weight: 6,
                    opacity: 0.9
                };
                break;
            case 'Route à 2 chaussées':
            case 'Bretelle':
                return {
                    color: '#FF9E4C',
                    weight: 4,
                    opacity: 0.9
                };
                break;
            case 'Route à 1 chaussée':
                return {
                    color: '#FF9E4C',
                    weight: 4,
                    opacity: 0.6
                };
                break;
            case 'Route empierrée':
            case 'Piste cyclable':
                return {
                    color: '#0000d0',
                    weight: 4,
                    opacity: 0.6
                };
                break;
            case 'Chemin':
            case 'Sentier':
            case 'Escalier':
                return {
                    color: '#0000d0',
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '12 8'
                };
                break;

            default:
                $log.warn('Unknown feature type ', feature.properties.nature);

        }
    }

    var DrawControl = L.Control.extend({

        initialize: function(handler, options) {
            L.Control.prototype.initialize.call(this, options);
            this._handler = handler;
        },

        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-bar');
            this._map = map;
            this._button = this._createButton('D', 'draw', 'draw-tool', container, this._handler, this);
            return container;
        },

        _createButton: function (html, title, className, container, fn, context) {
            var link = L.DomUtil.create('a', className, container);
            link.innerHTML = html;
            link.href = '#';
            link.title = title;

            var stop = L.DomEvent.stopPropagation;

            L.DomEvent
                .on(link, 'click', stop)
                .on(link, 'mousedown', stop)
                .on(link, 'dblclick', stop)
                .on(link, 'click', L.DomEvent.preventDefault)
                .on(link, 'click', fn, context)
                .on(link, 'click', this._refocusOnMap, context);

            return link;
        }
    });

    var mouseMarkerIcon = new L.DivIcon({className: 'mouse-marker-icon'});
    var pathStepIcon = new L.DivIcon({className: 'path-step-icon'});


    return {
        restrict: 'EA',
        replace: true,
        template: '<div class="map"></div>',
        scope: {
            currentLayer: '=',
            showRouteLayer: '='
        },
        link: function(scope, elt, attrs) {
            L.Icon.Default.imagePath = 'images';

            var map = L.map(elt[0], { zoomControl: true }).setView([45.2014, 6.67], 16);

            var routesLayer = L.geoJson([], {
                style: styleFeature
            });
            routesLayer.addTo(map);

            var lastRouteData;

            var refreshLayer = function() {
                routesLayer.clearLayers();
                var bounds = map.getBounds();
                $http.get('/routes?minX=' + bounds.getSouth() +'&minY=' + bounds.getWest() +
                    '&maxX=' + bounds.getNorth() + '&maxY=' + bounds.getEast()).success(function(res){
                    lastRouteData = res;
                    routesLayer.clearLayers();
                    if (scope.showRouteLayer) {
                        routesLayer.addData(lastRouteData);
                        if (res.length >= 5000) {
                            toaster.pop('warning', 'Warning', 'Trop d\'objets dans la vue');
                        }

                    }
                    epGraph.feedGraphData(res);

                });
            };
            refreshLayer();

            scope.$watch('showRouteLayer', function(show){
                if (!show) {
                    routesLayer.clearLayers();
                } else if (lastRouteData) {
                    routesLayer.clearLayers();
                    routesLayer.addData(lastRouteData);
                }
            });

            map.on('moveend', refreshLayer);
            map.on('zoomend', refreshLayer);


            // base layer

            var baseLayer;

            scope.$watch('currentLayer', function(l) {
                if (baseLayer) {
                    map.removeLayer(baseLayer);
                    baseLayer = null;
                }
                if (l) {
                    baseLayer = L.tileLayer(l.url, {
                        attribution: l.attribution
                    });
                    baseLayer.addTo(map);

                }
            });

            // path

            var drawPathActive = false;
            /**
             * @type {L.FeatureGroup}
             */
            var pathLayer = new L.FeatureGroup();
            pathLayer.addTo(map);

            /**
             * temporary last added point
             * @type {L.Marker}
             */
            var lastAddedPoint = null;

            /**
             * @type {L.Marker}
             */
            var currentMouseMarker;
            /**
             *
             * @type {L.Polyline}
             */
            var currentMouseLine;
            var mouseTooltipPopup;

            new DrawControl(function(){
                drawPathActive = !drawPathActive;

                if (!drawPathActive) {
                    if (currentMouseMarker) {
                        map.removeLayer(currentMouseMarker);
                        currentMouseMarker = null;
                    }
                    if (currentMouseLine) {
                        map.removeLayer(currentMouseLine);
                        currentMouseLine = null;
                    }
                    if (lastAddedPoint) {
                        map.removeLayer(lastAddedPoint);
                        lastAddedPoint = null;
                    }
                    if (mouseTooltipPopup) {
                        map.removeLayer(mouseTooltipPopup);
                        mouseTooltipPopup = null;
                    }

                }
                if (drawPathActive) {
                    scope.$apply(function(){
                        pathModel.clearSteps();
                    });
                }
            },  {
                position: 'topleft'
            }).addTo(map);

            function distance(latlngA, latlngB) {
                return map.latLngToLayerPoint(latlngA).distanceTo(map.latLngToLayerPoint(latlngB));
            }

            scope.$on('pathModelChanged', function(){
                pathLayer.clearLayers();

                _.each(pathModel.steps, function(step, index){
                    if (index === 0) {
                        pathLayer.addLayer(new L.Marker(step.from, {icon: pathStepIcon}));

                    }
                    pathLayer.addLayer(new L.Marker(step.to, {icon: pathStepIcon}));
                    pathLayer.addLayer(new L.Polyline(step.line, { color: 'red', width: 16 }));

                });
                if (currentMouseLine) {
                    map.removeLayer(currentMouseLine);
                    currentMouseLine = null;
                }

            });

            var getLastAddedLatLng = function() {
                if (lastAddedPoint) {
                    return  lastAddedPoint.getLatLng();
                } else if (pathModel.steps.length > 0) {
                    return pathModel.lastStep().to;
                }
            };

            map.on('mousemove', function(e){
                if (drawPathActive) {
                    if (!currentMouseMarker) {
                        currentMouseMarker = L.marker(e.latlng, {icon: mouseMarkerIcon}).addTo(map);
                    }
                    if (!currentMouseLine) {
                        var lastAdded = getLastAddedLatLng();
                        if (lastAdded) {
                            currentMouseLine = L.polyline([lastAdded, e.latlng], {weight: 4, color: '#d4e023', opacity: 0.5}).addTo(map);
                        }
                    }

                    // snap
                    var closest = epGraph.findClosest(e.latlng, 15);
                    currentMouseMarker.setLatLng(closest ? closest : e.latlng);

                    // line to cursor
                    if (currentMouseLine) {
                        currentMouseLine.spliceLatLngs(1, 1, e.latlng);

                        // tooltip
                        if (!mouseTooltipPopup){
                            mouseTooltipPopup = L.popup({offset: L.point(50, 0), closeButton: false, autoPan: false, className: 'distance-indicator-popup'})
                                .setLatLng(e.latlng)
                                .setContent('...')
                                .openOn(map);
                        }

                        mouseTooltipPopup.setLatLng(e.latlng);
                        var label = currentMouseLine.getLatLngs()[0].distanceTo(e.latlng).toFixed(1) + ' m';
                        if (closest && closest.alt && closest.alt !== -99) {
                            label += ' - altitude ' + closest.alt.toFixed(1) + ' m';
                        }
                        mouseTooltipPopup.setContent(label);

                    }



                }
            });
            map.on('click', function(e){
                if (drawPathActive && currentMouseMarker) {
                    var position = currentMouseMarker.getLatLng();
                    var previousLatLng = getLastAddedLatLng();
                    if (previousLatLng) {
                        scope.$apply(function(){
                            pathModel.addStep(previousLatLng, position);
                        });
                    }

                    if (lastAddedPoint) {
                        map.removeLayer(lastAddedPoint);
                        lastAddedPoint = null;
                    }
                    if (pathModel.steps.length === 0) {
                        lastAddedPoint = new L.Marker(position, {icon: pathStepIcon});
                        map.addLayer(lastAddedPoint);
                    }
                    if (currentMouseLine) {
                        map.removeLayer(currentMouseLine);
                        currentMouseLine = null;
                    }
                    if (mouseTooltipPopup){
                        map.closePopup(mouseTooltipPopup);
                        mouseTooltipPopup = null;

                    }
                }
            });

            scope.$on('mapZoomStep', function($evt, step){
                var bounds = new L.LatLngBounds(step);
                map.fitBounds(bounds);
            });

            scope.$on('mapZoomPoint', function($evt, feature){
                if (feature && feature.geometry){
                    map.setView(L.latLng(feature.geometry.coordinates[1],
                        feature.geometry.coordinates[0]), 17);
                }
            });
        }
    }

});