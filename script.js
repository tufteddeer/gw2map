"use strict";

let leafletmap

document.addEventListener("DOMContentLoaded", () => {
    initMap()
})

function initMap() {

    leafletmap = L.map('map').setView([0, 0], 4);

    L.tileLayer('https://tiles.guildwars2.com/{continent_id}/{floor}/{z}/{x}/{y}.jpg', {
        continent_id: 1,
        floor: 1,
        minZoom: 0,
        maxZoom: 7,
        noWrap: true
    }).addTo(leafletmap);

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

    for (let r in regions) {
        for (let m in regions[r].maps) {
            const map = regions[r].maps[m]

            //filter out the many story maps
            if (map.tasks.length === 0 &&
                map.skill_challenges.length === 0) {
                continue
            }

            const labelCoords = unproject(leafletmap, map.label_coord)

            const marker = new L.marker(labelCoords, {opacity: 0.0});
            marker.bindTooltip(map.name, {permanent: true, className: "region-label", offset: [0, 0]});
            marker.addTo(leafletmap);
        }
    }
}

// convert points to map positions (lat/lng) that can be displayed on a map
function unproject(map, coordinates) {
    return map.unproject(coordinates, map.getMaxZoom())
}