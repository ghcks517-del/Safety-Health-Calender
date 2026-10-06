const username = "testuser" + Date.now();
const pin = "123124";

async function test() {
  console.log("Registering...");
  let res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, pin, pinConfirm: pin })
  });
  console.log("Register status:", res.status);
  let data = await res.json();
  console.log("Register data:", data);

  console.log("Logging in...");
  res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, pin })
  });
  console.log("Login status:", res.status);
  data = await res.json();
  console.log("Login data:", data);
}

test().catch(console.error);
