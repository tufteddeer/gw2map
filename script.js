"use strict";

let leafletmap

let map_name_labels

document.addEventListener("DOMContentLoaded", () => {
    initMap()
})

const taskIcon = L.icon({
    iconUrl: 'https://render.guildwars2.com/file/B3DEEC72BBEF0C6FC6FEF835A0E275FCB1151BB7/102439.png',
    iconSize:     [16, 16],
});

function initMap() {

    leafletmap = L.map('map').setView([0, 0], 4);

    L.tileLayer('https://tiles.guildwars2.com/{continent_id}/{floor}/{z}/{x}/{y}.jpg', {
        continent_id: 1,
        floor: 1,
        minZoom: 0,
        maxZoom: 7,
        noWrap: true
    }).addTo(leafletmap);

    leafletmap.on("zoomend", (e) => {

        if (leafletmap.getZoom() <= 2) {
            leafletmap.removeLayer(map_name_labels)
        } else {
            leafletmap.addLayer(map_name_labels)
        }
    })

    console.log("fetching api data...")

    const endpoint = "https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=1" // TODO: use real endpoint, TODO: v2?
    fetch("/apiresult.json")
        .then(response => response.json())
        .then(data => {
            console.log("loaded data")
            renderData(data)
        })
        .catch((error => {
            console.error(error)
    }))
}

function renderData(data) {
    // todo: validate input

    const regions = data.regions

    map_name_labels = L.layerGroup()
    for (let r in regions) {
        for (let m in regions[r].maps) {
            const map = regions[r].maps[m]

            //filter out the many story maps
            if (map.tasks.length === 0 &&
                map.skill_challenges.length === 0) {
                continue
            }

            const labelCoords = unproject(leafletmap, map.label_coord)

            const marker = new L.marker(labelCoords, {opacity: 0.0})
            marker.bindTooltip(map.name, {permanent: true, className: "region-label", offset: [0, 0]})
            marker.addTo(map_name_labels)

            for (let t in map.tasks) {
                const task = map.tasks[t]

                const taskCoords = unproject(leafletmap, task.coord)
                const marker = new L.marker(taskCoords, {icon: taskIcon})
                marker.bindTooltip(task.objective)
                marker.addTo(leafletmap)
            }
        }
    }

    map_name_labels.addTo(leafletmap)
}

// convert points to map positions (lat/lng) that can be displayed on a map
function unproject(map, coordinates) {
    return map.unproject(coordinates, map.getMaxZoom())
}