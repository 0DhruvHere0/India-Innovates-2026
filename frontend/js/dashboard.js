const API_URL = "http://localhost:3000";
let allReports = [];
let currentFilter = "ALL";
let heatLayer;
const delhiBounds = L.latLngBounds(
    [28.20, 76.80],
    [28.95, 77.80]
);
const map = L.map("map", {
    maxBounds: delhiBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 10,
    maxZoom: 18
});
map.fitBounds(delhiBounds);
L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap contributors"
    }
).addTo(map);
const reportList = document.getElementById("reportList");
const totalReports = document.getElementById("totalReports");
const pendingReports = document.getElementById("pendingReports");
const resolvedReports = document.getElementById("resolvedReports");
async function loadReports() {
    const response = await fetch(`${API_URL}/reports`);
    allReports = await response.json();
    displayReports();
}
function displayReports() {
    reportList.innerHTML = "";
    let reports = allReports;
    if (currentFilter !== "ALL") {
        reports = reports.filter(r => r.status === currentFilter);
    }
    let total = 0;
    let pending = 0;
    let resolved = 0;
    let heatPoints = [];
    reports.forEach(report => {
        total++;
        if (report.status === "Pending") pending++;
        if (report.status === "Resolved") resolved++;
        heatPoints.push([
            report.latitude,
            report.longitude,
            report.upvotes + 1
        ]);
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>Issue:</strong> ${report.issue_category}<br>
            <strong>Colony:</strong> ${report.colony}<br>
            <strong>Description:</strong> ${report.description}<br>
            <strong>Support:</strong> 👍 ${report.upvotes}<br>
            <strong>Status:</strong>
            <select class="status" data-id="${report.id}">
                <option ${report.status==="Pending"?"selected":""}>Pending</option>
                <option ${report.status==="Under Review"?"selected":""}>Under Review</option>
                <option ${report.status==="Resolved"?"selected":""}>Resolved</option>
            </select>
            <br><br>
            <img src="http://localhost:3000/${report.image_url}" width="200">
            <br><br>
            <button class="navigateBtn"
                data-lat="${report.latitude}"
                data-lng="${report.longitude}">
                Navigate
            </button>
            <button class="deleteBtn"
                data-id="${report.id}">
                Delete
            </button>
        `;
        reportList.appendChild(li);
    });
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    heatLayer = L.heatLayer(heatPoints, {
        radius: 15,
        blur: 40,
        maxZoom: 6,
        minOpacity: 0.5
    }).addTo(map);
    totalReports.innerText = total;
    pendingReports.innerText = pending;
    resolvedReports.innerText = resolved;
}
function filterReports(status) {
    currentFilter = status;
    displayReports();
}
document.addEventListener("change", async function(e) {
    if (e.target.classList.contains("status")) {
        const id = e.target.dataset.id;
        const status = e.target.value;
        await fetch(`${API_URL}/report/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        });
        loadReports();
    }
});
document.addEventListener("click", async function(e) {
    if (e.target.classList.contains("deleteBtn")) {
        const id = e.target.dataset.id;
        if (confirm("Delete this report?")) {
            await fetch(`${API_URL}/report/${id}`, {
                method: "DELETE"
            });
            loadReports();
        }
    }
});
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("navigateBtn")) {
        const lat = e.target.dataset.lat;
        const lng = e.target.dataset.lng;
        const url =
            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        window.open(url, "_blank");
    }
});
loadReports();
