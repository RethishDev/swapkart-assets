// Example: fetch item data using query param `id`, like: item-details.html?id=5

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("id");

  if (!itemId) {
    alert("Item ID not found in URL.");
    return;
  }

  fetch(`/api/items/${itemId}`)
    .then(res => res.json())
    .then(item => {
      document.getElementById("itemImage").src = `/images/${item.imagePath || 'default.png'}`;
      document.getElementById("itemName").textContent = item.name;
      document.getElementById("itemType").textContent = item.type;
      document.getElementById("itemCategory").textContent = item.category;
      document.getElementById("itemCity").textContent = item.city;
      document.getElementById("postedBy").textContent = item.postedBy || "Anonymous";
      document.getElementById("itemDescription").textContent = item.description || "No description.";
    })
    .catch(err => {
      console.error(err);
      alert("Failed to load item details.");
    });
});

function goBack() {
  window.location.href = "items.html";
}
