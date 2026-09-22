const message = document.getElementById("message");

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "Logging in...";

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formDataToObject(loginForm))
    });

    const data = await res.json();

    if (res.ok) {
      location.href = "/";
    } else {
      message.textContent = data.message;
    }
  });
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "Creating account...";

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formDataToObject(registerForm))
    });

    const data = await res.json();

    if (res.ok) {
      location.href = "/";
    } else {
      message.textContent = data.message;
    }
  });
}