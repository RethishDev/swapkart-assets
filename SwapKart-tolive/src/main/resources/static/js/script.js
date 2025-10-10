function applyFilters() {
  try {
    const searchQuery = document.getElementById('searchQuery')?.value || '';
    const itemType = document.getElementById('itemType')?.value || '';
    const itemCategory = document.getElementById('itemCategory')?.value || '';
    const itemCity = document.getElementById('itemCity')?.value || '';

    // Build query parameters
    const params = new URLSearchParams();
    if (searchQuery) params.append('query', searchQuery);
    if (itemType) params.append('type', itemType);
    if (itemCategory) params.append('category', itemCategory);
    if (itemCity) params.append('city', itemCity);

    // Use the search endpoint with query parameters
    fetch(`/api/items/search?${params.toString()}`)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        // Check if we have paginated results or direct array
        const items = data.content || data;
        renderItems(Array.isArray(items) ? items : []);
      })
      .catch(err => console.error("Failed to load items:", err));
  } catch (error) {
    console.error("Error in applyFilters:", error);
  }
}

function renderItems(items) {
  const list = document.getElementById('itemList');
  list.innerHTML = "";

  if (items.length === 0) {
    list.innerHTML = "<p>No items found.</p>";
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <img src="/images/${item.imagePath || 'default.png'}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p>Type: ${item.type}</p>
      <p>Category: ${item.category}</p>
      <p>City: ${item.city}</p>
      <button onclick="alert('Viewing ${item.name}')">View Details</button>
    `;
    list.appendChild(card);
  });
}

// Load items initially
applyFilters();
