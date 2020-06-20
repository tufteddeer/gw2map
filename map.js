"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const map = new Gw2Map("map")
})

const taskIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/B3DEEC72BBEF0C6FC6FEF835A0E275FCB1151BB7/102439.png',
    iconSize: [16, 16],
})

const poiIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/25B230711176AB5728E86F5FC5F0BFAE48B32F6E/97461.png',
    iconSize: [16, 16],
})

const skillIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/B4EC6BB3FDBC42557C3CAE0CAA9E57EBF9E462E3/156626.png',
    iconSize: [16, 16],
})

const waypointIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/32633AF8ADEA696A1EF56D3AE32D617B10D3AC57/157353.png',
    iconSize: [16,16],
})

/**
 * a Marker is a type of thing we want to display on our map
 */
class Marker {
    /**
     *
     * @param {string} type name of the json field to use (e.g. tasks)
     * @param {L.icon} icon leaflet icon to use on the map
     * @param {string} displayField json field used as tooltip (e.g. poi name, task description)
     */
    constructor(type, icon, displayField) {
        this.type = type
        this.icon = icon
        this.displayField = displayField
    }
}

const markerTypes = [
    new Marker("tasks", taskIcon, "objective"),
    new Marker("points_of_interest", poiIcon, "name"),
    new Marker("skill_challenges", skillIcon, undefined),
]

class Gw2Map {
    /**@param {string}id
     */
    constructor (id) {

        this.leafletMap = L.map(id).setView([0, 0], 4)
        this.map_name_labels = L.layerGroup()

        this.renderData = this.renderData.bind(this)
        this.unproject = this.unproject.bind(this)
        this.addMarker = this.addMarker.bind(this)

        L.tileLayer('https://tiles.guildwars2.com/{continent_id}/{floor}/{z}/{x}/{y}.jpg', {
            continent_id: 1,
            floor: 1,
            minZoom: 0,
            maxZoom: 7,
            noWrap: true
        }).addTo(this.leafletMap);

        this.leafletMap.on("zoomend", (e) => {

            if (this.leafletMap.getZoom() <= 2) {
                this.leafletMap.removeLayer(this.map_name_labels)
            } else {
                this.leafletMap.addLayer(this.map_name_labels)
            }
        })

        console.log("fetching api data...")

        const endpoint = "https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=1" //TODO: v2?
        fetch("/apiresult.json")// todo: use real endpoint
            .then(response => response.json())
            .then(data => {
                console.log("loaded data")
                this.renderData(data)
            })
            .catch((error => {
                console.error(error)
            }))
    }

    /**
     * add a bunch of interesting things like tasks and points of interest to the map
     * @param data
     */
    renderData (data) {
        // todo: validate input

        const regions = data.regions

        for (let r in regions) {
            for (let m in regions[r].maps) {
                const map = regions[r].maps[m]
                // filter out the many story maps we are not interested in // todo: this also removes the big cities like lions arch
                if (map.tasks.length === 0 &&
                    map.skill_challenges.length === 0) {
                    continue
                }

                // add different types of markers to the map
                markerTypes.forEach(type => {
                    this.addMarker(map, type)
                })

                // display the name of the map
                const labelCoords = this.unproject(map.label_coord)

                const marker = new L.marker(labelCoords, {opacity: 0.0})
                marker.bindTooltip(map.name, {permanent: true, className: "region-label", offset: [0, 0]})
                marker.addTo(this.map_name_labels)
            }
        }

        this.map_name_labels.addTo(this.leafletMap)
    }

    /**
     * add all markers of the given type to the leaflet map
     * @param map the json data describing the map
     * @param {Marker} markerType the type of marker to display
     */
    addMarker (map, markerType) {

        // check whether our data has something about our marker
        if (!map.hasOwnProperty(markerType.type)) {
            console.error("map does not have information for markers of type " + markerType.type)
            return
        }

        const data = map[markerType.type]

        for (let i in data) {
            const entry = data[i]

            const coord = this.unproject(entry.coord)

            /* the crazy people at arena.net decided it would be fun to store waypoints as points of interest with a special "type" entry
                instead of giving them an own category ¯\_(ツ)_/¯
                so instead of just using the icon we have to check for this and destroy our wonderful method of adding stuff
                to the map in a generic way
             */
            const icon = (entry.hasOwnProperty("type") && entry.type === "waypoint") ? waypointIcon : markerType.icon

            const marker = new L.marker(coord, {icon: icon})

            if (entry.hasOwnProperty(markerType.displayField)) {

                marker.bindTooltip(entry[markerType.displayField])
            }
            marker.addTo(this.leafletMap)
        }
    }

    unproject(coordinates) {
        return this.leafletMap.unproject(coordinates, this.leafletMap.getMaxZoom())
    }
}