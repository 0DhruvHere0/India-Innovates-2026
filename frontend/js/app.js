const API_URL = "http://localhost:3000";
const form = document.getElementById("reportForm");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const latitudeText = document.getElementById("latitude");
const longitudeText = document.getElementById("longitude");
const successMessage = document.getElementById("successMessage");
let latitude = null;
let longitude = null;
imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        imagePreview.innerHTML =
            `<img src="${e.target.result}" width="100%">`;
    };
    reader.readAsDataURL(file);
});
function getLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function (position) {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            latitudeText.innerText = "Latitude: " + latitude;
            longitudeText.innerText = "Longitude: " + longitude;
        },
        function () {
            alert("Location access denied");
        }
    );
}
getLocation();
form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const file = imageInput.files[0];
    if (!file) {
        alert("Please capture an image");
        return;
    }
    const colony = document.getElementById("colony").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    if (!latitude || !longitude) {
        alert("Waiting for GPS location...");
        return;
    }
    const formData = new FormData();
    formData.append("image", file);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("colony", colony);
    formData.append("mobile", mobile);
    try {
        const response = await fetch(`${API_URL}/report`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        successMessage.innerHTML =
            `
            <h3>Complaint Submitted</h3>
            <p>Your Acknowledgement Number:</p>
            <h2>${result.acknowledgement}</h2>
            `;
        form.reset();
        imagePreview.innerHTML = "";
    }
    catch (error) {
        console.error(error);
        alert("Submission failed");
    }
});
