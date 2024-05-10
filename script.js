

function fetchRocketLaunchData() {
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
    try {
        fetch(fullUrl, options)
            .then(response => response.json())
            .then(data => {
                results = data.result
                results.forEach(r => {
                    const element = generateListElement(r)
                    addElementToList(element)
                })
            })
    } catch (e) {
        console.log("Error fetching data: " + e);
    }
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

function generateListElement(result) {

}

function addElementToList(element) {

}

function addMap(userLocation) {

    console.warn(userLocation) // is an Array here [lat, long]

    console.log(userLocation[0]) // how is this undefined then??


    mapboxgl.accessToken = 'pk.eyJ1IjoibmlrbHV6IiwiYSI6ImNrZjF0ZDZ5aTFha3MzMG1ic3BvN3hxdXkifQ.Cj_SS8daXsIijQjJZYdk4Q';
    const map = new mapboxgl.Map({
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

function nav(){
    document.getElementById('nav-toggle').addEventListener('click', function() {
        document.querySelector('nav').classList.toggle('nav-visible');
    });
}



function main() {

    fetchRocketLaunchData()

    getUserLocation().then(userLocation => {
        addMap(userLocation);
    }).catch(error => {
        console.error(error);
    });

    nav()

}

main()