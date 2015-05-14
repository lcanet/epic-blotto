angular.module('epicBlotto').directive('mapView', function($rootScope, $http, $log, epGraph){

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

    return {
        restrict: 'EA',
        replace: true,
        template: '<div class="map"></div>',
        scope: {
            currentLayer: '='
        },
        link: function(scope, elt, attrs) {
            L.Icon.Default.imagePath = 'images';

            var map = L.map(elt[0], { zoomControl: true }).setView([45.2014, 6.67], 16);

            var routesLayer = L.geoJson([], {
                style: styleFeature
                /*
                pointToLayer: function(feature, latLng) {
                    var iconName = feature.properties.icon;
                    var icon = iconsCache[iconName];
                    if (!icon) {
                        icon = L.divIcon({className: 'divicon wi wi-' +iconName, iconSize: [32, 32]});
                        iconsCache[iconName] = icon;
                    }
                    return L.marker(latLng, {icon: icon});
                }
                 */
            });
            routesLayer.addTo(map);


            var refreshLayer = function() {
                routesLayer.clearLayers();
                var bounds = map.getBounds();
                $http.get('/routes?minX=' + bounds.getSouth() +'&minY=' + bounds.getWest() +
                    '&maxX=' + bounds.getNorth() + '&maxY=' + bounds.getEast()).success(function(res){
                    routesLayer.clearLayers();
                    routesLayer.addData(res);

                    epGraph.feedGraphData(routesLayer);

                });
            };
            refreshLayer();

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
            var currentPathDrawLayer = new L.FeatureGroup();
            currentPathDrawLayer.addTo(map);
            var mouseMarkerIcon = new L.DivIcon({className: 'mouse-marker-icon'});
            var pathStepIcon = new L.DivIcon({className: 'path-step-icon'});

            /**
             * @type {L.Marker}
             */
            var currentDrawMarker;

            var DrawControl = L.Control.extend({

                onAdd: function (map) {
                    var container = L.DomUtil.create('div', 'leaflet-bar');
                    this._map = map;
                    this._button = this._createButton('D', 'draw', 'draw-tool', container, this._activate, this);
                    return container;
                },

                _activate: function (e) {
                    drawPathActive = !drawPathActive;

                    if (!drawPathActive) {
                        if (currentDrawMarker) {
                            map.removeLayer(currentDrawMarker);
                            currentDrawMarker = null;
                        }

                        currentPathDrawLayer.clearLayers();
                    }
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
            new DrawControl({position: 'topleft'}).addTo(map);

            function distance(latlngA, latlngB) {
                return map.latLngToLayerPoint(latlngA).distanceTo(map.latLngToLayerPoint(latlngB));
            }

            function findClosest(latLng, tolerance) {
                var closest = null, closestDistance = Infinity;

                routesLayer.eachLayer(function(line){
                    _.each(_.flatten(line.getLatLngs()), function(ll){
                        var d = distance(latLng, ll);
                        if (d < closestDistance){
                            closest = ll;
                            closestDistance = d;
                        }
                    });
                });

                if (closestDistance < tolerance && closest != null) {
                    return closest;
                }
            }

            map.on('mousemove', function(e){
                if (drawPathActive) {
                    if (!currentDrawMarker) {
                        currentDrawMarker = new L.Marker(e.latlng, {icon: mouseMarkerIcon});
                        currentDrawMarker.addTo(map);
                    }
                    var closest = findClosest(e.latlng, 15);
                    currentDrawMarker.setLatLng(closest ? closest : e.latlng);
                }
            });
            map.on('click', function(e){
                if (drawPathActive && currentDrawMarker) {
                    currentPathDrawLayer.addLayer(new L.Marker(currentDrawMarker.getLatLng(), {icon: pathStepIcon}));

                    var currentLayers = currentPathDrawLayer.getLayers();
                    var line = _.find(currentLayers, function(layer){
                        return layer instanceof L.Polyline;
                    });
                    if (!line) {
                        if (currentLayers.length > 0) {
                            line = new L.Polyline([currentLayers[0].getLatLng(), currentDrawMarker.getLatLng()], { color: 'red', width: 16 });
                            currentPathDrawLayer.addLayer(line);
                        }
                    } else {
                        var last = _.last(line.getLatLngs());
                        var res = epGraph.findPath(last, currentDrawMarker.getLatLng());
                        if (res) {
                            _.each(res, function(node){
                                line.addLatLng(node.latlng);
                            });
                        } else {
                            line.addLatLng(currentDrawMarker.getLatLng());
                        }
                    }

                }
            });
        }
    }

});