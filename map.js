"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const endpoint = "https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=1"
    fetch("/apiresult.json")
        .then(response => response.json())
        .then(data => {
            console.log("loaded data")
            new Gw2Map("map", data)

        })
        .catch((error => {
            console.error(error)
        }))
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

const customIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/540BA9BB6662A5154BD13306A1AEAD6219F95361/102369.png',
    iconSize: [20,20]
})

class Gw2Map {
    /**@param {string}id
     * @param data
     */
    constructor (id, data) {

        this.leafletMap = L.map(id).setView([0, 0], 4)
        this.map_name_labels = L.layerGroup()

        this.prepareData = this.prepareData.bind(this)
        this.renderData = this.renderData.bind(this)
        this.unproject = this.unproject.bind(this)
        this.toggleLayer = this.toggleLayer.bind(this)
        this.addToggleEvents = this.addToggleEvents.bind(this)
        this.newMarker = this.newMarker.bind(this)
        this.addLayer = this.addLayer.bind(this)
        this.displayStats = this.displayStats.bind(this)
        this.updateBreadcrumps = this.updateBreadcrumps.bind(this)
        this.createCustomMarkerDialog = this.createCustomMarkerDialog.bind(this)

        this.markerLayers = new Map()

        this.customMarkers = []

        L.tileLayer('https://tiles.guildwars2.com/{continent_id}/{floor}/{z}/{x}/{y}.jpg', {
            continent_id: 1,
            floor: 1,
            minZoom: 0,
            maxZoom: 7,
            noWrap: true,
            attribution: "© Map data and images: ArenaNet",
        }).addTo(this.leafletMap);

        this.leafletMap.on("zoomend", (e) => {

            if (this.leafletMap.getZoom() <= 2) {
                this.leafletMap.removeLayer(this.map_name_labels)
            } else {
                this.leafletMap.addLayer(this.map_name_labels)
            }
        })

        this.leafletMap.on("click", (event) => {
            const coord = event.latlng

            L.popup({className: "customPopup"})
                .setLatLng(coord)
                .setContent(this.createCustomMarkerDialog(coord))
                .openOn(this.leafletMap)

        })

        this.prepareData(data)
        this.renderData()

        this.addToggleEvents()
    }

    addToggleEvents() {
        const elements = document.querySelectorAll(".layerToggle")

        elements.forEach(e => {
            console.log(e)
            e.addEventListener("click", event => {
                const active = this.toggleLayer(e.id)

                if (active) {
                    e.classList.add("selected")
                } else {
                    e.classList.remove("selected")
                }
            })
        })
    }

    /**
     * extract the things we want to display later, transform coordinates to LatLng and add relevant metadata
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
        this.sectors = []

        for (let r in regions) {
            // Crystal Desert apparently has wrong coordinates, ignore it
            if (r === "12") {
                continue
            }
            for (let m in regions[r].maps) {

                const map = regions[r].maps[m]

                if (map.label_coord !== undefined) {
                    if (map.tasks.length !== 0 || map.points_of_interest.length > 5) // todo: better filtering of story instances
                        this.map_names.push({name: map.name, coord: map.label_coord})
                }

                this.tasks = this.tasks.concat(map.tasks)
                this.skillpoints = this.skillpoints.concat(map.skill_challenges)

                // add metadata we need to display breadcrump info for selected sectors
                const sectors = []
                for (let sector of map.sectors) {
                    sector.parentmap = map.name
                    sector.parentregion = regions[r].name

                    sectors.push(sector)
                }
                this.sectors = this.sectors.concat(sectors)

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

        this.unprojectAllThings(this.tasks, this.skillpoints, this.waypoints, this.vistas, this.landmarks, this.map_names, this.sectors)
    }

    /** add markers and labels to the map */
    renderData() {


        const taskLayer = this.addLayer("tasks")
        for (let task of this.tasks) {
            taskLayer.addLayer(this.newMarker(task.coord, taskIcon, task.objective))
        }

        const landmarkLayer = this.addLayer("poi")
        for (let landmark of this.landmarks) {
            landmarkLayer.addLayer(this.newMarker(landmark.coord, poiIcon, landmark.name))
        }

        const skillLayer = this.addLayer("skills")
        for (let skill of this.skillpoints) {
            skillLayer.addLayer(this.newMarker(skill.coord, skillIcon, "Heropoint"))
        }

        const wpLayer = this.addLayer("waypoints")
        for (let wp of this.waypoints) {
            wpLayer.addLayer(this.newMarker(wp.coord, waypointIcon, wp.name))
        }

        const vistaLayer = this.addLayer("vistas")
        for (let vista of this.vistas) {
            vistaLayer.addLayer(this.newMarker(vista.coord, vistaIcon, "Vista"))
        }

        for (let mapLabel of this.map_names) {
            const marker = new L.marker(mapLabel.coord, {opacity: 0.0})
            marker.bindTooltip(mapLabel.name, {permanent: true, className: "region-label", offset: [0, 0]})
            marker.addTo(this.map_name_labels)
        }
        this.map_name_labels.addTo(this.leafletMap)

        const sectorLayer = this.addLayer("sectors")
        for (let sector of this.sectors) {

            let points = sector.bounds.map(value => {
                return this.unproject(value)
            })

            const poly = L.polygon(points, {fillOpacity: 0.0})
            poly.on("click", e => {
                this.updateBreadcrumps(sector)
            })
            sectorLayer.addLayer(poly)
        }

        const customLayer = this.addLayer("custom")

        this.displayStats();
    }

    /**
     * set the Region > Map > Sector names above the map to fit the selected sector
     * @param sector
     */
    updateBreadcrumps (sector) {
        const regionCrumb = document.getElementById("bc_region")
        const mapCrumb = document.getElementById("bc_map")
        const sectorCrumb = document.getElementById("bc_sector")

        regionCrumb.innerText = sector.parentregion + " ▶"
        mapCrumb.innerText = sector.parentmap + " ▶"
        sectorCrumb.innerText = sector.name
    }
    displayStats() {
        document.querySelector("#tasks > .stats").innerText = ` (${this.tasks.length})`
        document.querySelector("#poi > .stats").innerText = ` (${this.landmarks.length})`
        document.querySelector("#skills > .stats").innerText = ` (${this.skillpoints.length})`
        document.querySelector("#waypoints > .stats").innerText = ` (${this.waypoints.length})`
        document.querySelector("#vistas > .stats").innerText = ` (${this.vistas.length})`
        document.querySelector("#sectors > .stats").innerText = ` (${this.sectors.length})`
        document.querySelector("#custom > .stats").innerText = ` (${this.customMarkers.length})`
    }
    /**
     * create a new layer that can be enabled or disabled
     * @param name
     * @returns {L.LayerGroup}
     */
    addLayer (name) {
        const layer = L.layerGroup().addTo(this.leafletMap)
        this.markerLayers.set(name, layer)
        return layer
    }

    /**
     * create anew marker
     * @param coord marker position
     * @param icon marker icon
     * @param text marker tooltip
     * @returns {L.Marker}
     */
    newMarker (coord, icon, text) {
        return new L.marker(coord, {icon: icon}).bindTooltip(text)
    }

    /**
     * activate or deactivate the layer with the given name
     * @param name the name the layer is stored as
     * @returns {boolean} true if the layer is visible after, false if not
     */
    toggleLayer(name) {
        const layer = this.markerLayers.get(name)
        if (layer) {
            if (this.leafletMap.hasLayer(layer)) {
                this.leafletMap.removeLayer(layer)
                return false
            }
            this.leafletMap.addLayer(layer)
            return true
        }
        return false
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

    /**
     * build controls for creating a custom marker at given coordinates
     * @param {L.LatLng} coord
     * @returns {HTMLDivElement}
     */
    createCustomMarkerDialog(coord) {
        const dialog = document.createElement("div")
        const title = document.createElement("span")
        title.id = "customDialogTitle"
        title.innerText = "Custom marker"

        const position = document.createElement("span")
        const ingamePos = this.leafletMap.project(coord)
        position.innerText = `Ingame position: ${Math.round(ingamePos.x)}, ${Math.round(ingamePos.y)}`

        const label = document.createElement("label")
        label.innerText = "Name"
        label.id = "customNameLabel"

        const nameInput = document.createElement("input")
        nameInput.type = "text"
        label.append(nameInput)

        const button = document.createElement("button")
        button.id = "createCustomMarker"
        button.innerText = "Create"
        button.addEventListener("click", () => {
            this.markerLayers.get("custom").addLayer(this.newMarker(coord, customIcon, nameInput.value))

            this.customMarkers.push({coord: coord, name: nameInput.value})
            this.displayStats()
        })

        dialog.append(title, position, label, button)

        return dialog
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