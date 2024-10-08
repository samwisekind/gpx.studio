
import { settings } from "$lib/db";
import { gpxStatistics } from "$lib/stores";
import { get } from "svelte/store";

const { distanceMarkers, distanceUnits } = settings;

export class DistanceMarkers {
    map: mapboxgl.Map;
    updateBinded: () => void = this.update.bind(this);
    unsubscribes: (() => void)[] = [];

    constructor(map: mapboxgl.Map) {
        this.map = map;

        this.unsubscribes.push(gpxStatistics.subscribe(this.updateBinded));
        this.unsubscribes.push(distanceMarkers.subscribe(this.updateBinded));
        this.unsubscribes.push(distanceUnits.subscribe(this.updateBinded));
        this.map.on('style.import.load', this.updateBinded);
    }

    update() {
        try {
            if (get(distanceMarkers)) {
                let distanceSource = this.map.getSource('distance-markers');
                if (distanceSource) {
                    distanceSource.setData(this.getDistanceMarkersGeoJSON());
                } else {
                    this.map.addSource('distance-markers', {
                        type: 'geojson',
                        data: this.getDistanceMarkersGeoJSON()
                    });
                }
                if (!this.map.getLayer('distance-markers')) {
                    this.map.addLayer({
                        id: 'distance-markers',
                        type: 'symbol',
                        source: 'distance-markers',
                        layout: {
                            'text-field': ['get', 'distance'],
                            'text-size': 14,
                            'text-font': ['Open Sans Bold'],
                            'text-padding': 20,
                        },
                        paint: {
                            'text-color': 'black',
                            'text-halo-width': 2,
                            'text-halo-color': 'white',
                        }
                    });
                } else {
                    this.map.moveLayer('distance-markers');
                }
            } else {
                if (this.map.getLayer('distance-markers')) {
                    this.map.removeLayer('distance-markers');
                }
            }
        } catch (e) { // No reliable way to check if the map is ready to add sources and layers
            return;
        }
    }

    remove() {
        this.unsubscribes.forEach(unsubscribe => unsubscribe());
    }

    getDistanceMarkersGeoJSON(): GeoJSON.FeatureCollection {
        let statistics = get(gpxStatistics);

        let features = [];
        let currentTargetDistance = 1;
        for (let i = 0; i < statistics.local.distance.total.length; i++) {
            if (statistics.local.distance.total[i] >= currentTargetDistance * (get(distanceUnits) === 'metric' ? 1 : 1.60934)) {
                let distance = currentTargetDistance.toFixed(0);
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [statistics.local.points[i].getLongitude(), statistics.local.points[i].getLatitude()]
                    },
                    properties: {
                        distance,
                    }
                } as GeoJSON.Feature);
                currentTargetDistance += 1;
            }
        }

        return {
            type: 'FeatureCollection',
            features
        };
    }
}