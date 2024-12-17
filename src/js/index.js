const apiUrl =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const provinceSelect = document.getElementById("province");
const municipalitySelect = document.getElementById("municipality");
const fuelSelect = document.getElementById("fuel");
const openNowCheckbox = document.getElementById("openNow");
const filterBtn = document.getElementById("filterBtn");
const stationsList = document.getElementById("stationsList");

let gasStations = [];

// Mapeo de tipos de carburante a claves del API
const fuelKeyMap = {
  "Diesel": "Precio Diesel A",
  "Gasolina 95": "Precio Gasolina 95 E5",
  "Gasolina 98": "Precio Gasolina 98 E5"
};

// Fetch initial data
fetch(apiUrl)
  .then((response) => response.json())
  .then((data) => {
    gasStations = data.ListaEESSPrecio;
    populateProvinces(gasStations);
  })
  .catch((error) => console.error("Error fetching data:", error));

// Populate province options
function populateProvinces(stations) {
  const provinces = [...new Set(stations.map((station) => station["Provincia"]))];
  provinces.sort().forEach((province) => {
    const option = document.createElement("option");
    option.value = province;
    option.textContent = province;
    provinceSelect.appendChild(option);
  });
}

// Populate municipality options
function populateMunicipalities(province) {
  municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
  if (!province) return;

  const municipalities = [
    ...new Set(
      gasStations
        .filter((station) => station["Provincia"] === province)
        .map((station) => station["Municipio"])
    ),
  ];

  municipalities.sort().forEach((municipality) => {
    const option = document.createElement("option");
    option.value = municipality;
    option.textContent = municipality;
    municipalitySelect.appendChild(option);
  });

  municipalitySelect.disabled = false;
}

// Check if the station is open now
function isStationInService(schedule) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (schedule.includes("L-D: 24H")) return true;

  const daysMap = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
  const hours = schedule.split(";");

  for (const hour of hours) {
    const [days, timeRange] = hour.split(": ");
    const [startDay, endDay] = days.split("-").map((d) => daysMap[d.trim()]);
    const [start, end] = timeRange
      .split("-")
      .map((t) => t.split(":").reduce((h, m) => h * 60 + Number(m)));

    if (
      ((currentDay >= startDay && currentDay <= endDay) ||
        (endDay < startDay && (currentDay >= startDay || currentDay <= endDay))) &&
      ((currentTime >= start && currentTime <= end) ||
        (end < start && (currentTime >= start || currentTime <= end)))
    ) {
      return true;
    }
  }
  return false;
}

// Filter stations and display results
function filterStations() {
  const province = provinceSelect.value;
  const municipality = municipalitySelect.value;
  const fuelType = fuelSelect.value;
  const openNow = openNowCheckbox.checked;

  let filteredStations = gasStations;

  if (province) {
    filteredStations = filteredStations.filter(
      (station) => station["Provincia"] === province
    );
  }

  if (municipality) {
    filteredStations = filteredStations.filter(
      (station) => station["Municipio"] === municipality
    );
  }

  if (fuelType) {
    const apiKey = fuelKeyMap[fuelType];
    filteredStations = filteredStations.filter((station) =>
      station[apiKey] &&
      parseFloat(station[apiKey].replace(",", ".")) > 0
    );
  }

  if (openNow) {
    filteredStations = filteredStations.filter((station) =>
      isStationInService(station["Horario"])
    );
  }

  // Ordenar gasolineras por precio de menor a mayor
  filteredStations.sort((a, b) => {
    const priceA = fuelType ? parseFloat(a[fuelKeyMap[fuelType]].replace(",", ".")) : 0;
    const priceB = fuelType ? parseFloat(b[fuelKeyMap[fuelType]].replace(",", ".")) : 0;
    return priceA - priceB;
  });

  displayStations(filteredStations, fuelType);
}

// Display stations
function displayStations(stations, fuelType) {
  stationsList.innerHTML = "";
  if (stations.length === 0) {
    stationsList.textContent = "No se encontraron gasolineras.";
    return;
  }

  stations.forEach((station) => {
    const stationElement = document.createElement("div");
    stationElement.className = "station";

    // Obtener el precio del carburante seleccionado
    const apiKey = fuelType ? fuelKeyMap[fuelType] : null;
    const fuelPrice = apiKey ? station[apiKey] : "No disponible";

    stationElement.innerHTML = `
      <h4>${station["Rótulo"]}</h4>
      <p><strong>Dirección:</strong> ${station["Dirección"]}</p>
      <p><strong>Localidad:</strong> ${station["Municipio"]}</p>
      <p><strong>Provincia:</strong> ${station["Provincia"]}</p>
      <p><strong>Horario:</strong> ${station["Horario"]}</p>
      ${fuelType
        ? `<p><strong>Precio ${fuelType}:</strong>
           <span class="${determineColorClass(fuelPrice)}">${fuelPrice} €/litro</span></p>`
        : ''
      }
      <p><strong>Tipo de venta:</strong> ${station["Tipo de venta"]}</p>
    `;
    stationsList.appendChild(stationElement);
  });
}

// Función para determinar la clase de color según el precio
function determineColorClass(price) {
  const priceValue = parseFloat(price.replace(",", "."));
  if (priceValue < 1.5) return 'price-low';
  if (priceValue >= 1.5 && priceValue < 1.7) return 'price-medium';
  return 'price-high';
}

// Event listeners
provinceSelect.addEventListener("change", () =>
  populateMunicipalities(provinceSelect.value)
);
filterBtn.addEventListener("click", filterStations);
