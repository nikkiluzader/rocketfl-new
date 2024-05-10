let map, globalLocation, userMarker, launchMarker, directionalLine, bearingPopUp;

const pads = {
    "TBD": "",
    "SLC-41":[-80.583056, 28.583333],
    "LC-39A":[-80.604333, 28.608389]
}


function fetchRocketLaunchData() {
    return new Promise((resolve, reject) => {
        const key = "f0c3ad60-b756-4f6b-8ce3-8c9201d2537a";
        const apiUrl = "https://fdo.rocketlaunch.live/json/launches";
        const params = {
            "after_date": formatDate(new Date()),
            "state_abbr": "FL",
            "limit": 10
        };
        const queryString = Object.keys(params).map(function (key) {
            return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        }).join("&");

        const fullUrl = apiUrl + "?" + queryString;

        const options = {
            "method": "get",
            "headers": {
                "Authorization": `Bearer ${key}`
            }
        };
        fetch(fullUrl, options)
            .then(response => response.json())
            .then(data => {
                const results = data.result;
                console.log(results)
                const elements = results.map(r => addElementToList(r));
                resolve(elements);
            })
            .catch(e => {
                console.log("Error fetching data: " + e);
                reject(e);
            });
    });
}


function formatDate(date) {
    const yyyy = date.getFullYear();
    let mm = date.getMonth() + 1;
    let dd = date.getDate();

    // padding
    if (mm < 10) mm = "0" + mm;
    if (dd < 10) dd = "0" + dd;

    return yyyy + "-" + mm + "-" + dd;
}


function convertToLocaleDateTime(isoString) {

    const date = new Date(isoString);

    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hours = date.getHours();
    let minutes = date.getMinutes();

    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    if (hours < 10) hours = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;

    const localDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;

    console.log(localDateTime)

    return localDateTime;
}


function extractLaunchData(data) {
    //Provider	Vehicle	Location	Pad	Mission	Launch Window	ETL (Estimated Time of Launch)
    const launchDate = new Date(data.sort_date * 1000).toLocaleDateString()
    const launchWindowOpen = data.win_open == null ? "N/A" : data.win_open
    const launchWindowClose = data.win_close == null ? "N/A" : data.win_close
    const launchWindow = `${launchWindowOpen} - ${launchWindowClose}`
    const etl = new Date(data.t0).toLocaleTimeString()
    const provider = data.provider.name
    const vehicle = data.vehicle.name
    const location = data.pad.location.name
    const pad = data.pad.name
    const mission = data.missions[0].name

    return [launchDate, launchWindow, etl, provider, vehicle, location, pad, mission]

}


function openModal(launch) {
    const modalContent = `
        <h1>${launch.name}</h1>
        <p><strong>Launch Date:</strong> ${launch.t0 ? new Date(launch.t0).toLocaleString() : 'TBD'}</p>
        <p><strong>Provider:</strong> ${launch.provider.name}</p>
        <p><strong>Vehicle:</strong> ${launch.vehicle.name}</p>
        <p><strong>Location:</strong> ${launch.pad.name}, ${launch.pad.location.name}</p>
        <p><strong>Mission Description:</strong> ${launch.missions[0] && launch.missions[0].description ? launch.missions[0].description : 'No description available.'}</p>
        <p><strong>More Info:</strong> <a href="https://rocketlaunch.live/launch/${launch.slug}" target="_blank">Click here</a></p>
    `;

    // Inserting modal content into the modal content div
    const modalElement = document.getElementById('modal-content');
    modalElement.innerHTML = modalContent;

    // Display the entire modal
    document.getElementById('launch-modal').style.display = 'block';
}


function closeModal() {
    const modalElement = document.getElementById('launch-modal');
    modalElement.style.display = 'none'; // Hide the modal
}


function updateMap(padName) {
    let coords;
    if(padName == "Pad TBD"){
        coords = pads["TBD"]
    }else{
        coords = pads[padName]
    }

    const popupElement = document.querySelector('.mapboxgl-popup');
    if (popupElement) {
        popupElement.addEventListener('click', () => {
            bearingPopUp.remove();
        });
    }
    launchMarker.remove()
    map.removeLayer("line")
    map.removeSource("line")


    // Add launch location marker
    launchMarker = new mapboxgl.Marker({ color: 'red', class: "launch-marker"})
        .setLngLat(coords)
        .addTo(map);

    map.addSource('line', {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: globalLocation
            }
        }
    });

    map.addLayer({
        id: 'line',
        type: 'line',
        source: 'line',
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-color': 'red',
            'line-width': 3
        }
    });

    // Calculate bearing and convert to compass direction
    const bearing = calculateBearing(globalLocation[1], globalLocation[0], -80.583056, 28.583333);
    const compassDirection = bearingToCompass(bearing);
    const midpoint = calculateMidpoint(globalLocation[1], globalLocation[0], -80.583056, 28.583333);

    // Add a popup at the midpoint
    bearingPopUp = new mapboxgl.Popup()
        .setLngLat(midpoint)
        .setHTML(`${bearing.toFixed(2)}° ${compassDirection}`)
        .addTo(map);

    // Close the popup when it's clicked
    bearingPopUp.on('open', () => {
        const popupElement = document.querySelector('.mapboxgl-popup');
        if (popupElement) {
            popupElement.addEventListener('click', () => {
                popup.remove();
            });
        }
    });
}


function addElementToList(launch) {
    const container = document.getElementById('upcoming-launches');

    const launchCard = document.createElement('div');
    launchCard.className = 'launch-card';
    // launchCard.onclick = () => updateMap(launch.pad.location); // not working. need to store launch data in global variable
    launchCard.onclick = () => {
        const padRegex = /Pad: ([^,]+),/;
        const match = launchCard.innerHTML.match(padRegex);
        const padName = match ? match[1] : 'Pad name not found';
        updateMap(padName)
    };
    launchCard.ondblclick = () => openModal(launch);

    // Create HTML content for the launch card
    const content = `
        <h4>${launch.name} - ${launch.date_str}</h4>
        <p>Provider: ${launch.provider.name}</p>
        <p>Vehicle: ${launch.vehicle.name}</p>
        <p>Pad: ${launch.pad.name}, ${launch.pad.location.name}</p>
    `;

    launchCard.innerHTML = content;
    container.appendChild(launchCard);
}


function addMap(userLocation) {
    console.warn(userLocation);

    mapboxgl.accessToken = 'pk.eyJ1IjoibmlrbHV6IiwiYSI6ImNrZjF0ZDZ5aTFha3MzMG1ic3BvN3hxdXkifQ.Cj_SS8daXsIijQjJZYdk4Q';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v9',
        projection: 'mercator',
        zoom: 6,
        center: [-81.760254, 27.994402]
    });

    if (userLocation) {
        const userLngLat = [userLocation[1], userLocation[0]];
        const launchLngLat = [-80.583056, 28.583333]; // Assuming this is the fixed launch location

        // Add user location marker
        userMarker = new mapboxgl.Marker()
            .setLngLat(userLngLat)
            .addTo(map);

        // Add launch location marker
        launchMarker = new mapboxgl.Marker({ color: 'red', class: "launch-marker"})
            .setLngLat(launchLngLat)
            .addTo(map);

        // Draw a line from user location to launch location
        map.on('load', function () {
            map.addSource('line', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: [userLngLat, launchLngLat]
                    }
                }
            });

            map.addLayer({
                id: 'line',
                type: 'line',
                source: 'line',
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': 'red',
                    'line-width': 3
                }
            });

            // Calculate bearing and convert to compass direction
            const bearing = calculateBearing(userLocation[1], userLocation[0], -80.583056, 28.583333);
            const compassDirection = bearingToCompass(bearing);
            const midpoint = calculateMidpoint(userLocation[1], userLocation[0], -80.583056, 28.583333);

            // Add a popup at the midpoint
            bearingPopUp = new mapboxgl.Popup()
                .setLngLat(midpoint)
                .setHTML(`${bearing.toFixed(2)}° ${compassDirection}`)
                .addTo(map);

            // Close the popup when it's clicked
            bearingPopUp.on('open', () => {
                const popupElement = document.querySelector('.mapboxgl-popup');
                if (popupElement) {
                    popupElement.addEventListener('click', () => {
                        popup.remove();
                    });
                }
            });
        });
    }
}


function calculateMidpoint(lat1, lng1, lat2, lng2) {
    const dLng = degreesToRadians(lng2 - lng1);
    lat1 = degreesToRadians(lat1);
    lat2 = degreesToRadians(lat2);
    lng1 = degreesToRadians(lng1);

    const bx = Math.cos(lat2) * Math.cos(dLng);
    const by = Math.cos(lat2) * Math.sin(dLng);
    const lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2),
                            Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by));
    const lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx);

    return [radiansToDegrees(lat3), radiansToDegrees(lng3)];
}


function calculateBearing(startLat, startLng, destLat, destLng) {
    let lon1 = degreesToRadians(startLng);
    let lon2 = degreesToRadians(destLng);
    let lat1 = degreesToRadians(startLat);
    let lat2 = degreesToRadians(destLat);

    let dLon = lon2 - lon1;
    let x = Math.sin(dLon) * Math.cos(lat2);
    let y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = radiansToDegrees(Math.atan2(x, y));
    bearing = (bearing + 360) % 360; // Normalize
    
    let oppositeBearing = (bearing + 180) % 360;

    return oppositeBearing; // Return the opposite bearing normalized
}


function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}


function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}


function bearingToCompass(bearing) {
    const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    bearing = (bearing + 360) % 360; // Normalize
    let sectorIndex = Math.floor(bearing / 22.5 + 0.5); // Calculate sector index
    return sectors[sectorIndex % 16]; // Return the corresponding sector
}


function getUserLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function (position) {
                console.log("Latitude: " + position.coords.latitude);
                console.log("Longitude: " + position.coords.longitude);
                resolve([position.coords.latitude, position.coords.longitude]);
            }, function (error) {
                console.log("The user denied location access.");
                reject(error);
            });
        } else {
            console.log("Geolocation is not supported by this browser.");
            reject(new Error("Geolocation is not supported by this browser."));
        }
    });
}


function updateNav(){
    document.getElementById('nav-toggle').addEventListener('click', function() {
        document.querySelector('nav').classList.toggle('nav-visible');
    });
}


function main() {

    updateNav()

    fetchRocketLaunchData().then(elements => {
        elements.forEach(e => addElementToList(e));
    }).catch(error => {
        console.error("Failed to fetch rocket launch data: ", error);
    });

    getUserLocation().then(userLocation => {
        globalLocation = userLocation
        addMap(userLocation);
    }).catch(error => {
        console.error(error);
    });


}


main()