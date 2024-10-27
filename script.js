const map = L.map("map").setView([40.7128, -74.006], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let markers = L.markerClusterGroup();
const markerColor = "#ff5733";
const filters = {
  crimeType: "all",
  vicSex: "all",
  vicAgeGroup: "all",
};
let allData = [];

// Load JSON data only once to populate dropdowns and initialize map
async function initializeData() {
  const response = await fetch("crimes_2022_jan.json");
  allData = await response.json();
  populateDropdowns(allData);
  filterAndRenderMarkers(); // Initial render with all data
}

function populateDropdowns(data) {
  const crimeTypeCounts = { all: data.length };
  const victimSexes = new Set(["all"]);
  const victimAgeGroups = new Set(["all"]);

  // Define custom ordering for VIC_AGE_GROUP
  const ageGroupOrder = ["all", "<18", "18-24", "25-44", "45-64", "65+"];

  // Count each crime type occurrence
  data.forEach((item) => {
    const crimeType = item.OFNS_DESC;
    if (crimeType) {
      crimeTypeCounts[crimeType] = (crimeTypeCounts[crimeType] || 0) + 1;
    }
    if (item.VIC_SEX) victimSexes.add(item.VIC_SEX);
    if (item.VIC_AGE_GROUP) victimAgeGroups.add(item.VIC_AGE_GROUP);
  });

  // Update dropdowns: crime types with counts (sorted), victim sex and age group with custom order
  updateDropdownWithCounts("crimeTypeSelect", crimeTypeCounts);
  updateDropdown("vicSexSelect", Array.from(victimSexes));
  updateDropdown(
    "vicAgeGroupSelect",
    Array.from(victimAgeGroups).sort(
      (a, b) => ageGroupOrder.indexOf(a) - ageGroupOrder.indexOf(b)
    )
  );
}

function updateDropdownWithCounts(selectId, options) {
  const selectElement = document.getElementById(selectId);
  selectElement.innerHTML = "";

  // Sort options by count in descending order, with "all" as the first item
  const sortedOptions = Object.entries(options).sort(
    ([aKey, aCount], [bKey, bCount]) => {
      if (aKey === "all") return -1;
      if (bKey === "all") return 1;
      return bCount - aCount;
    }
  );

  // Populate the dropdown
  sortedOptions.forEach(([option, count]) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = `${option} (${count})`;
    selectElement.appendChild(opt);
  });
}

function updateDropdown(selectId, options) {
  const selectElement = document.getElementById(selectId);
  selectElement.innerHTML = "";
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    selectElement.appendChild(opt);
  });
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function filterAndRenderMarkers() {
  markers.clearLayers();
  const chunkSize = 50000;
  let index = 0;

  function processChunk() {
    const chunk = allData.slice(index, index + chunkSize);
    chunk.forEach((item) => {
      const latitude = parseFloat(item.Latitude);
      const longitude = parseFloat(item.Longitude);
      const cmplntDate = item.CMPLNT_FR_DT
        ? formatDate(item.CMPLNT_FR_DT)
        : "N/A";

      if (matchesFilters(item) && !isNaN(latitude) && !isNaN(longitude)) {
        const marker = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: markerColor,
          color: "#333",
          weight: 1,
          fillOpacity: 0.8,
        });

        marker.bindPopup(`
          <strong>Crime Type:</strong> ${item.OFNS_DESC}<br>
          <strong>Victim Sex:</strong> ${item.VIC_SEX}<br>
          <strong>Victim Age Group:</strong> ${item.VIC_AGE_GROUP}<br>
          <strong>Complaint Date:</strong> ${cmplntDate}
        `);

        markers.addLayer(marker);
      }
    });

    index += chunkSize;
    if (index < allData.length) {
      setTimeout(processChunk, 0); // Process the next chunk asynchronously
    } else {
      map.addLayer(markers);
    }
  }

  processChunk(); // Start processing the first chunk
}

function matchesFilters(item) {
  return (
    (filters.crimeType === "all" || item.OFNS_DESC === filters.crimeType) &&
    (filters.vicSex === "all" || item.VIC_SEX === filters.vicSex) &&
    (filters.vicAgeGroup === "all" ||
      item.VIC_AGE_GROUP === filters.vicAgeGroup)
  );
}

// Update only the markers when filters are changed
document
  .getElementById("crimeTypeSelect")
  .addEventListener("change", function () {
    filters.crimeType = this.value;
    filterAndRenderMarkers();
  });
document.getElementById("vicSexSelect").addEventListener("change", function () {
  filters.vicSex = this.value;
  filterAndRenderMarkers();
});
document
  .getElementById("vicAgeGroupSelect")
  .addEventListener("change", function () {
    filters.vicAgeGroup = this.value;
    filterAndRenderMarkers();
  });

initializeData(); // Initial load
