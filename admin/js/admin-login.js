const adminLoginForm = document.getElementById("adminLoginForm");

adminLoginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const message = document.getElementById("message");
  message.textContent = "Signing in...";
  const response = await fetch("/api/admin/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(adminLoginForm)))
  });
  const result = await response.json();
  if (response.ok) location.href = "/admin/index.html";
  else message.textContent = result.message;
});
