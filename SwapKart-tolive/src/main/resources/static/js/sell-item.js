document.getElementById('sellForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('price', document.getElementById('price').value);
  formData.append('category', document.getElementById('category').value);
  formData.append('image', document.getElementById('image').files[0]);

  const response = await fetch('/api/items/sell', {
    method: 'POST',
    body: formData
  });

  if (response.ok) {
    alert("Item posted successfully!");
    window.location.href = "items.html";
  } else {
    const err = await response.text();
    alert("Error posting item: " + err);
  }
});
