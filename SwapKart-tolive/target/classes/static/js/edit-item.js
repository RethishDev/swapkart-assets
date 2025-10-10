document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("id");

    if (!itemId) {
        alert("No item ID provided.");
        return;
    }

    // Fetch item details
    const res = await fetch(`/api/items/${itemId}`);
    const item = await res.json();

    document.getElementById("title").value = item.title;
    document.getElementById("price").value = item.price;
    document.getElementById("category").value = item.category || '';
    document.getElementById("description").value = item.description;
    document.getElementById("imageUrl").value = item.imageUrl || '';

    // Handle form submit
    document.getElementById("editItemForm").addEventListener("submit", async function(e) {
        e.preventDefault();

        const updatedData = {
            title: document.getElementById("title").value,
            price: document.getElementById("price").value,
            category: document.getElementById("category").value,
            description: document.getElementById("description").value,
            imageUrl: document.getElementById("imageUrl").value
        };

        const updateRes = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (updateRes.ok) {
            alert("Item updated successfully!");
            window.location.href = "my-items.html";
        } else {
            alert("Failed to update item.");
        }
    });
});
