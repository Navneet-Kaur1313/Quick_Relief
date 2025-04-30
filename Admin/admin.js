document.addEventListener("DOMContentLoaded", function () {
    const userTable = document.getElementById("userTable");
    const addUserBtn = document.getElementById("addUserBtn");

    // Function to delete users
    function attachDeleteEvent(button) {
        button.addEventListener("click", function () {
            const row = this.closest("tr");
            row.remove();
            alert("User removed successfully!");
        });
    }

    // Attach delete event to existing buttons
    document.querySelectorAll(".delete-btn").forEach(button => attachDeleteEvent(button));

    // Add new user
    addUserBtn.addEventListener("click", function () {
        const userId = document.getElementById("userId").value;
        const userName = document.getElementById("userName").value;
        const userRole = document.getElementById("userRole").value;

        if (userId.trim() === "" || userName.trim() === "") {
            alert("Please enter valid User ID and Name.");
            return;
        }

        // Create new row
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td>${userId}</td>
            <td>${userName}</td>
            <td>${userRole}</td>
            <td><button class="delete-btn">Remove</button></td>
        `;

        // Append new row
        userTable.appendChild(newRow);

        // Attach delete event to new button
        attachDeleteEvent(newRow.querySelector(".delete-btn"));

        // Clear input fields
        document.getElementById("userId").value = "";
        document.getElementById("userName").value = "";
    });
});
