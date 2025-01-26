// Setup sidebar
window.onload = function () {
  const sidebar = document.querySelector(".sidebar");
  const closeBtn = document.querySelector("#btn");

  // sidebar click part
  closeBtn.addEventListener("click", function () {
    sidebar.classList.toggle("open")
    menuBtnChange()
  })

  // menu button changer part
  function menuBtnChange() {
    if (sidebar.classList.contains("open")) {
      closeBtn.classList.replace("bx-menu", "bx-menu-alt-right")
    } else {
      closeBtn.classList.replace("bx-menu-alt-right", "bx-menu")
    }
  }
}


const url =
  "https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/Major_Crime_Indicators_Open_Data/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json";

// Function to fetch data from the API
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

// Helper function to filter data by year range
function filterDataByYear(data, startYear, endYear) {
  const startDate = new Date(`${startYear}-01-01`).getTime();
  const endDate = new Date(`${endYear}-12-31`).getTime();

  return data.features.filter(feature => {
    const reportDate = new Date(feature.attributes.REPORT_DATE).getTime();
    return reportDate >= startDate && reportDate <= endDate;
  });
}

// Function to process the fetched data
function processData(data, startYear, endYear) {
  const filteredData = filterDataByYear(data, startYear, endYear);

  // Create a map to hold MCI categories as keys, and list of latitudes/longitudes as values
  const mciMap = new Map();

  filteredData.forEach(feature => {
    const attributes = feature.attributes;
    const latitude = attributes.LAT_WGS84;
    const longitude = attributes.LONG_WGS84;
    const mciCategory = attributes.MCI_CATEGORY;

    // Exclude points with latitude or longitude = 0
    if (mciCategory && latitude !== 0 && longitude !== 0) {
      // If the category already exists, add the point to the list
      if (!mciMap.has(mciCategory)) {
        mciMap.set(mciCategory, []);
      }
      mciMap.get(mciCategory).push([latitude, longitude]);
    }
  });

  return mciMap;
}

// Main function to fetch and process the data
async function read_data() {
  const startYear = 2020;
  const endYear = new Date().getFullYear(); // Current year

  console.log("Fetching data from the URL...");
  const rawData = await fetchData(url);

  if (rawData) {
    console.log("Processing data...");
    const mciMap = processData(rawData, startYear, endYear);

    // Display the processed MCI categories and their associated points
    mciMap.forEach((coordinates, category) => {
      console.log(`Category: ${category}`);
      console.log("Coordinates:", coordinates);
    });

    return mciMap;
  } else {
    console.error("Failed to fetch and process data.");
  }
}

var color_grads = new Map([
  ["Assault", ["FF6464", "FF1212"]],
  ["Break and Enter", ["66B2FF", "007BFF"]],
  ["Auto Theft", ["FFC966", "FFA500"]],
  ["Theft Over", ["85D788", "28A745"]],
  ["Robbery", ["B085F5", "6F42C1"]],
]);
function color_interpol(start, end, n) {
  var r0 = parseInt(start.substring(0, 2), 16), rd = parseInt(end.substring(0, 2), 16) - r0;
  var g0 = parseInt(start.substring(2, 4), 16), gd = parseInt(end.substring(2, 4), 16) - g0;
  var b0 = parseInt(start.substring(4, 6), 16), bd = parseInt(end.substring(4, 6), 16) - b0;
  var scale = (1 / (0.9 + n / 10))  // 
  var r = parseInt(r0 + rd * scale), g = parseInt(g0 + gd * scale), b = parseInt(b0 + bd * scale);

  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0') + '88'
}

var activated = new Map([
  ["Assault", true],
  ["Break and Enter", true],
  ["Auto Theft", true],
  ["Theft Over", true],
  ["Robbery", true],
]);
var clusterGroups = new Map();
function create_clusters() {
  accidents.forEach((records, category) => {
    var clusterGroup = L.markerClusterGroup({
      iconCreateFunction: function (cluster) {
        var markers = cluster.getAllChildMarkers();
        var n = markers.length;
        var size = 30 + Math.sqrt(n) * 5;
        var color = color_interpol(color_grads.get(category)[0], color_grads.get(category)[1], n);
        return L.divIcon({
          html: `<div style="width: ${size}px; 
                  height: ${size}px; 
                  background-color: ${color}; 
                  text-align: center; 
                  font-size: 24px;
                  border-radius: ${size}px;"></div>`,
          className: '',
          iconSize: L.point(size, size),
        });
      },
      chunkedLoading: true,
    });
    clusterGroups.set(category, clusterGroup);

    myIcon = L.divIcon({
      html: `<div style="width: 20px; 
          height: 20px; 
          background-color: #${color_grads.get(category)[1]}88; 
          text-align: center; 
          font-size: 24px;
          border-radius: 20px;"></div>`,
      className: '',
      iconSize: L.point(20, 20),
    });
    for (marker of records) {
      clusterGroup.addLayer(L.marker([marker[0], marker[1]], {
        icon: myIcon,
      }));
    }
    map.addLayer(clusterGroup);
  });
}

function toggleFilter(category) {
  activated.set(category, !activated.get(category));
  var toggle = document.getElementsByClassName(toggleClassNames.get(category))[0];
  if (activated.get(category)) {
    map.addLayer(clusterGroups.get(category))
    toggle.style.backgroundColor = '#' + color_grads.get(category)[0];
    toggle.style.border = '3px solid #' + color_grads.get(category)[1];
  } else {
    map.removeLayer(clusterGroups.get(category));
    toggle.style.backgroundColor = '#c0c0c0';
    toggle.style.border = '3px solid #7a7a7a';
  }
}

var toggleClassNames = new Map([
  ["Assault", "assault_toggle"],
  ["Break and Enter", "break_enter_toggle"],
  ["Auto Theft", "auto_theft_toggle"],
  ["Theft Over", "theft_toggle"],
  ["Robbery", "robbery_toggle"],
])
function initializeToggles() {
  toggleClassNames.forEach((className, category) => {
    var toggle = document.getElementsByClassName(className)[0];
    toggle.style.backgroundColor = '#' + color_grads.get(category)[0];
    toggle.style.border = '3px solid #' + color_grads.get(category)[1];
  });
}

async function main() {
  accidents = await read_data();
  if (accidents == null) {
    console.error("Nothing returned from read_data()");
  }

  create_clusters();
  initializeToggles();
}

// Initialize Leaflet map
var map = L.map('map').setView([43.733644, -79.361635], 11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  maxNativeZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> | Data source: <a href="https://data.torontopolice.on.ca/pages/open-data">Toronto Police Service PSDP</a>'
}).addTo(map);

main()