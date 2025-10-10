document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById('notificationList');

  const response = await fetch('/api/users/notifications', {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  });

  if (response.ok) {
    const notifications = await response.json();

    if (notifications.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:gray;'>No new notifications.</p>";
      return;
    }

    notifications.forEach(note => {
      const div = document.createElement("div");
      div.className = "notification";
      div.innerHTML = `
        <strong>${note.title}</strong>
        <p>${note.message}</p>
        <time>${new Date(note.timestamp).toLocaleString()}</time>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p style='text-align:center; color:red;'>Failed to load notifications.</p>";
  }
});
