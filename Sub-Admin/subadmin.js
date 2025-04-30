document.addEventListener("DOMContentLoaded", function () {
    const resourceForm = document.getElementById("resourceForm");
    const resourceChartCtx = document.getElementById("resourceChart").getContext("2d");

    let resources = {
        Water: 50,
        Food: 30,
        Medical: 20,
    };

    function updateChart() {
        new Chart(resourceChartCtx, {
            type: "bar",
            data: {
                labels: Object.keys(resources),
                datasets: [{
                    label: "Available Resources",
                    data: Object.values(resources),
                    backgroundColor: ["#0077b6", "#ff7b00", "#2a9d8f"]
                }]
            }
        });
    }

    resourceForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const resourceName = document.getElementById("resourceName").value;
        const resourceAmount = parseInt(document.getElementById("resourceAmount").value);

        if (resources[resourceName]) {
            resources[resourceName] += resourceAmount;
        } else {
            resources[resourceName] = resourceAmount;
        }

        updateChart();
        alert("Resource added successfully!");
        resourceForm.reset();
    });

    updateChart();
});

// Verify Disaster Reports
function verifyReport(button) {
    const row = button.closest("tr");
    row.cells[3].innerText = "Verified";
    button.remove();
}

// Logout Function
function logout() {
    window.location.href = "login.html";
}

// Google Maps Initialization
function initMap() {
    const mapOptions = {
        center: { lat: 20.5937, lng: 78.9629 }, // Centered at India
        zoom: 5
    };

    const map = new google.maps.Map(document.getElementById("map"), mapOptions);

    const locations = [
        { lat: 28.7041, lng: 77.1025, title: "Flood in Delhi" },
        { lat: 19.076, lng: 72.8777, title: "Earthquake in Mumbai" }
    ];

    locations.forEach(location => {
        new google.maps.Marker({
            position: location,
            map: map,
            title: location.title
        });
    });
}
