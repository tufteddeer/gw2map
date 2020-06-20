"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const map = new Gw2Map("map")
})

const taskIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/B3DEEC72BBEF0C6FC6FEF835A0E275FCB1151BB7/102439.png',
    iconSize: [16, 16],
});

class Gw2Map {
    /**@param {string}id
     */
    constructor (id) {

        this.leafletMap = L.map(id).setView([0, 0], 4)
        this.map_name_labels = L.layerGroup()

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

    renderData (data) {
        // todo: validate input

        const regions = data.regions

        for (let r in regions) {
            for (let m in regions[r].maps) {
                const map = regions[r].maps[m]

                //filter out the many story maps
                if (map.tasks.length === 0 &&
                    map.skill_challenges.length === 0) {
                    continue
                }

                const labelCoords = this.unproject(map.label_coord)

                const marker = new L.marker(labelCoords, {opacity: 0.0})
                marker.bindTooltip(map.name, {permanent: true, className: "region-label", offset: [0, 0]})
                marker.addTo(this.map_name_labels)

                for (let t in map.tasks) {
                    const task = map.tasks[t]

                    const taskCoords = this.unproject(task.coord)
                    const marker = new L.marker(taskCoords, {icon: taskIcon})
                    marker.bindTooltip(task.objective)
                    marker.addTo(this.leafletMap)
                }
            }
        }

        this.map_name_labels.addTo(this.leafletMap)
    }

    unproject(coordinates) {
        return this.leafletMap.unproject(coordinates, this.leafletMap.getMaxZoom())
    }
}