async function filterItems() {
  const city = document.getElementById('cityInput').value.trim();
  const resultContainer = document.getElementById('itemResults');
  resultContainer.innerHTML = "";

  if (!city) {
    resultContainer.innerHTML = "<p style='text-align:center; color:gray;'>Please enter a location.</p>";
    return;
  }

  const response = await fetch(`/api/items/location?city=${encodeURIComponent(city)}`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  });

  if (response.ok) {
    const items = await response.json();

    if (items.length === 0) {
      resultContainer.innerHTML = "<p style='text-align:center; color:gray;'>No items found for this location.</p>";
      return;
    }

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <h4>${item.name}</h4>
        <p>${item.description}</p>
        <p><strong>₹${item.price}</strong></p>
        <p>📍 ${item.city}</p>
      `;
      resultContainer.appendChild(card);
    });
  } else {
    resultContainer.innerHTML = "<p style='text-align:center; color:red;'>Error loading items.</p>";
  }
}
