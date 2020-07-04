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

        this.prepareData = this.prepareData.bind(this)
        this.renderData = this.renderData.bind(this)
        this.unproject = this.unproject.bind(this)
        this.addMarker = this.addMarker.bind(this)
        this.displaySectors = this.displaySectors.bind(this)
        this.updateBreadcrumps = this.updateBreadcrumps.bind(this)

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
        let skillpoints = []
        let waypoints = []
        let vistas = []
        let landmarks = []

        for (let r in regions) {
            for (let m in regions[r].maps) {

                const map = regions[r].maps[m]

                this.tasks = this.tasks.concat(map.tasks)
                skillpoints = skillpoints.concat(map.skill_challenges)

                /*
                    The gw2api stores different types of points of interest using the same array, but they can be differentiated by
                    their "type" attribute. This oddity is the reason that filtering the data is not as straightforward as it could be
                 */
                if (map.points_of_interest.length > 0) {

                    waypoints = waypoints.concat(filterPointsOfInterestByType(map.points_of_interest, "waypoints"))
                    vistas = vistas.concat(filterPointsOfInterestByType(map.points_of_interest, "vista"))
                    landmarks = landmarks.concat(filterPointsOfInterestByType(map.points_of_interest, "landmark"))
                }
            }

        }

        this.unprojectAllThings(this.tasks/*, skillpoints, waypoints, vistas, landmarks*/)
    }

    renderData() {

        for(let task of this.tasks) {
            const marker = new L.marker(task.coord, {icon: taskIcon})

            marker.bindTooltip(task.description)

            marker.addTo(this.leafletMap)
        }

    }

        /*for (let i of waypoints) {
            console.log(i)
        }*/

        /*for (let r in regions) {
            const region = regions[r]
            for (let m in region.maps) {
                const map = region.maps[m]
                // filter out the many story maps we are not interested in // todo: this also removes the big cities like lions arch
                if (map.tasks.length === 0 &&
                    map.skill_challenges.length === 0) {
                    continue
                }

                // add different types of markers to the map
                markerTypes.forEach(type => {
                    this.addMarker(map, type)
                })

                this.displaySectors(region, map, map.sectors)

                // display the name of the map
                const labelCoords = this.unproject(map.label_coord)

                const marker = new L.marker(labelCoords, {opacity: 0.0})
                marker.bindTooltip(map.name, {permanent: true, className: "region-label", offset: [0, 0]})
                marker.addTo(this.map_name_labels)
            }
        }

        this.map_name_labels.addTo(this.leafletMap)*/
    //}

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

            /* the crazy people at arena.net decided it would be fun to store waypoints or vistas as points of interest with a special "type" entry
                instead of giving them an own category ¯\_(ツ)_/¯
                so instead of just using the icon we have to check for this and destroy our wonderful method of adding stuff
                to the map in a generic way
             */
            let icon = markerType.icon;

            if (markerType.type === "points_of_interest") {
                switch (entry.type) {
                    case "vista":
                        icon = vistaIcon
                        break
                    case "waypoint":
                        icon = waypointIcon
                }
            }

            const marker = new L.marker(coord, {icon: icon})

            if (entry.hasOwnProperty(markerType.displayField) && entry[markerType.displayField] !== "") {

                marker.bindTooltip(entry[markerType.displayField])
            }
            marker.addTo(this.leafletMap)
        }
    }

    /**
     * Add sector polygons to the map
     * @param {region} parentregion region this sector belongs to
     * @param {map} parentmap map this sector belongs to
     * @param {sector[]} sectors
     */
    displaySectors (parentregion, parentmap, sectors) {
        sectors.forEach(sector => {
            let points = sector.bounds.map(value => this.unproject(value))
            const poly = L.polygon(points).addTo(this.leafletMap)

            poly.on("click", e => {
                this.updateBreadcrumps(parentregion, parentmap, sector)
            })
        })
    }

    updateBreadcrumps (region, map, sector) {
        const regionCrumb = document.getElementById("bc_region")
        const mapCrumb = document.getElementById("bc_map")
        const sectorCrumb = document.getElementById("bc_sector")

        regionCrumb.innerText = region.name + " ▶"
        mapCrumb.innerText = map.name + " ▶"
        sectorCrumb.innerText = sector.name
    }

    unproject(coordinates) {
        return this.leafletMap.unproject(coordinates, this.leafletMap.getMaxZoom())
    }

    /**
     *
     */
    unprojectAllThings(...groups) {

        for (let group of groups) {
            for (let thing of group) {
                console.log(thing.coord)
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