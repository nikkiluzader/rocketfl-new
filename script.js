let map, globalLocation;

const pads = {
    "TBD": "",
    "SLC-41":[28.583333, -80.583056],
    "LC-39A":[28.608389, -80.604333]
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


function updateMap(location) {
    const lat = parseFloat(location.latitude); // Make sure your data includes latitude
    const long = parseFloat(location.longitude); // Make sure your data includes longitude

    map.flyTo({
        center: [55, 35],
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
}


function addElementToList(launch) {
    const container = document.getElementById('upcoming-launches');

    const launchCard = document.createElement('div');
    launchCard.className = 'launch-card';
    launchCard.onclick = () => updateMap(launch.pad.location);
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

    console.warn(userLocation) // is an Array here [lat, long]

    console.log(userLocation[0]) // how is this undefined then??


    mapboxgl.accessToken = 'pk.eyJ1IjoibmlrbHV6IiwiYSI6ImNrZjF0ZDZ5aTFha3MzMG1ic3BvN3hxdXkifQ.Cj_SS8daXsIijQjJZYdk4Q';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v9',
        projection: 'mercator', // Display the map as a globe, since satellite-v9 defaults to Mercator
        zoom: 6,
        center: [-81.760254, 27.994402]
    });

    if (userLocation) {
        const popup = new mapboxgl.Popup({ closeOnClick: false })
            .setLngLat([userLocation[1], userLocation[0]])
            .setHTML('<p>You</p>')
            .addTo(map);
    }


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