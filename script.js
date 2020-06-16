"use strict";

let map

document.addEventListener("DOMContentLoaded", () => {
    initMap()
})

function initMap() {

    map = L.map('map').setView([0, 0], 4);

    L.tileLayer('https://tiles.guildwars2.com/{continent_id}/{floor}/{z}/{x}/{y}.jpg', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        continent_id: 1,
        floor: 1,
        minZoom: 0,
        maxZoom: 7,
        noWrap: true
    }).addTo(map);

}