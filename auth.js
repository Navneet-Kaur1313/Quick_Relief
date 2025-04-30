document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent default form submission

            const role = document.getElementById("role").value;

            // Redirect users based on selected role
            if (role === "admin") {
                window.location.href = "Admin/admin.html";
            } else if (role === "subadmin") {
                window.location.href = "Sub-Admin/subadmin.html";
            } else if (role === "victim") {
                window.location.href = "Victim/victim.html";
            } else if (role === "authority") {
                window.location.href = "Authority/authorities.html";
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent default form submission

            // Simulate storing data and redirect to login
            alert("Account created successfully! Please login.");
            window.location.href = "login.html";
        });
    }
});
