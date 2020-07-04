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

const vistaIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/A2C16AF497BA3A0903A0499FFBAF531477566F10/358415.png',
    iconSize: [16,16],
})

class Gw2Map {
    /**@param {string}id
     */
    constructor (id) {

        this.leafletMap = L.map(id).setView([0, 0], 4)
        this.map_name_labels = L.layerGroup()

        this.prepareData = this.prepareData.bind(this)
        this.renderData = this.renderData.bind(this)
        this.unproject = this.unproject.bind(this)

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

        const endpoint = "https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=1"
        fetch("/apiresult.json")
            .then(response => response.json())
            .then(data => {
                console.log("loaded data")
                this.prepareData(data)
                this.renderData()
            })
            .catch((error => {
                console.error(error)
            }))
    }

    /**
     * extract the things we want to display later
     * @param data
     */
    prepareData ({regions}) {
        // todo: validate input

        this.tasks = []
        this.skillpoints = []
        this.waypoints = []
        this.vistas = []
        this.landmarks = []
        this.map_names = []

        for (let r in regions) {
            for (let m in regions[r].maps) {

                const map = regions[r].maps[m]

                if (map.label_coord !== undefined) {
                    if (map.tasks.length !== 0 || map.points_of_interest.length > 5) // todo: better filtering of story instances
                        this.map_names.push({name: map.name, coord: map.label_coord})
                }

                this.tasks = this.tasks.concat(map.tasks)
                this.skillpoints = this.skillpoints.concat(map.skill_challenges)

                /*
                    The gw2api stores different types of points of interest using the same array, but they can be differentiated by
                    their "type" attribute. This oddity is the reason that filtering the data is not as straightforward as it could be
                 */
                if (map.points_of_interest.length > 0) {

                    this.waypoints = this.waypoints.concat(filterPointsOfInterestByType(map.points_of_interest, "waypoint"))
                    this.vistas = this.vistas.concat(filterPointsOfInterestByType(map.points_of_interest, "vista"))
                    this.landmarks = this.landmarks.concat(filterPointsOfInterestByType(map.points_of_interest, "landmark"))
                }
            }

        }

        this.unprojectAllThings(this.tasks, this.skillpoints, this.waypoints, this.vistas, this.landmarks, this.map_names)
    }

    renderData() {

        for (let task of this.tasks) {
            const marker = new L.marker(task.coord, {icon: taskIcon})
            marker.bindTooltip(task.objective)
            marker.addTo(this.leafletMap)
        }

        for (let landmark of this.landmarks) {
            const marker = new L.marker(landmark.coord, {icon: poiIcon})
            marker.bindTooltip(landmark.name)
            marker.addTo(this.leafletMap)
        }

        for (let skill of this.skillpoints) {
            const marker = new L.marker(skill.coord, {icon: skillIcon})
            marker.bindTooltip("Heropoint")
            marker.addTo(this.leafletMap)
        }

        for (let wp of this.waypoints) {
            const marker = new L.marker(wp.coord, {icon: waypointIcon})
            marker.bindTooltip(wp.name)
            marker.addTo(this.leafletMap)
        }

        for (let vista of this.vistas) {
            const marker = new L.marker(vista.coord, {icon: vistaIcon})
            marker.bindTooltip("Vista")
            marker.addTo(this.leafletMap)
        }

        for (let mapLabel of this.map_names) {
            const marker = new L.marker(mapLabel.coord, {opacity: 0.0})
            marker.bindTooltip(mapLabel.name, {permanent: true, className: "region-label", offset: [0, 0]})
            marker.addTo(this.leafletMap)
        }
    }

    /**
     * convert coordinates to lat/lng
     * @param {[]} coordinates
     * @returns the unprojected coords
     */
    unproject(coordinates) {
        return this.leafletMap.unproject(coordinates, this.leafletMap.getMaxZoom())
    }

    /**
     * unproject the coordinates of every object in the given array(s)
     * @param groups one or more array with objects that have coordinates
     */
    unprojectAllThings(...groups) {

        for (let group of groups) {
            for (let thing of group) {
                thing.coord = this.unproject(thing.coord)
            }
        }
    }
}

/**
 * create a subset of points of interest by type
 * @param {PoinOfInterest[]} list of points of interests
 * @param {String} typeName
 * @returns {PointOfInterest[]} Every poi witch type is typeName. Empty array if there is none
 */
function filterPointsOfInterestByType(poi, typeName) {
    const  points = poi.filter(p => {
        return p.type === typeName
    })

    if (points) {
        return points
    } else {
        return []
    }
}