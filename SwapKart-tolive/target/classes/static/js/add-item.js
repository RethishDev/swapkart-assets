document.addEventListener('DOMContentLoaded', function() {
    // Get Jwt token from localstorage
    const jwtToken = localStorage.getItem('token');
    const currentPath = window.location.pathname;

    if (!jwtToken && !currentPath.endsWith('login.html')) {
        showError('Authentication Required', 'Please login to continue', 'Go to Login').then(() => {
            window.location.href = '/login.html';
        });
        return;
    }

    const form = document.getElementById('addItemForm');
    const imageInput = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const typeSelect = document.getElementById('type');
    const priceField = document.getElementById('priceField');
    const priceInput = document.getElementById('price');
    let imageFiles = [];

    // Toggle price field visibility based on item type
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            if (this.value === 'SELL') {
                priceField.style.display = 'block';
                priceInput.required = true;
            } else {
                priceField.style.display = 'none';
                priceInput.required = false;
                priceInput.value = '';
            }
        });
    }

    // Show success message
    function showSuccess(title, message) {
        return Swal.fire({
            icon: 'success',
            title: title,
            text: message,
            confirmButtonColor: '#0d6efd'
        });
    }

    // Show error message
    function showError(title, message, confirmText = 'OK') {
        return Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonText: confirmText,
            confirmButtonColor: '#dc3545'
        });
    }

    // Show loading
    function showLoading(title = 'Processing...') {
        Swal.fire({
            title: title,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        return Swal;
    }

    // Validate pincode (6 digits)
    function isValidPincode(pincode) {
        return /^\d{6}$/.test(pincode);
    }

    // Handle image preview
    imageInput.addEventListener('change', function(e) {
        imagePreview.innerHTML = '';
        imageFiles = Array.from(e.target.files).slice(0, 5); // Limit to 5 images

        if (imageFiles.length === 0) {
            return;
        }

        imageFiles.forEach(file => {
            if (!file.type.startsWith('image/')) {
                showError('Invalid File Type', 'Only image files are allowed');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('preview-image');
                imagePreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // Handle form submission
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get form values
            const title = document.getElementById('title').value.trim();
            const description = document.getElementById('description').value.trim();
            const type = document.getElementById('type').value;
            const category = document.getElementById('category').value;
            const condition = document.getElementById('condition').value;
            const city = document.getElementById('city').value.trim();
            const pincode = document.getElementById('pincode').value.trim();
            const price = type === 'SELL' ? document.getElementById('price').value.trim() : null;

            // Basic validation
            if (!title || !description || !category || !condition || !city || !pincode) {
                await showError('Missing Information', 'Please fill in all required fields');
                return;
            }

            // Validate pincode
            if (!isValidPincode(pincode)) {
                await showError('Invalid Pincode', 'Please enter a valid 6-digit pincode');
                return;
            }

            // Validate price if type is SELL
            if (type === 'SELL' && (!price || isNaN(price) || parseFloat(price) <= 0)) {
                await showError('Invalid Price', 'Please enter a valid price greater than 0');
                return;
            }

            // Validate images
            if (imageFiles.length === 0) {
                await showError('No Images', 'Please upload at least one image');
                return;
            }

            const loading = showLoading('Uploading your item...');

            try {
                // Create form data
                const formData = new FormData();
                // Add all required fields to form data
                formData.append('title', title);
                formData.append('description', description);
                formData.append('type', type);
                formData.append('category', category);
                formData.append('condition', condition);
                formData.append('city', city);
                formData.append('pincode', pincode);
                
                // Add status as a string that can be converted to ItemStatus enum
                formData.append('status', 'AVAILABLE');

                // Add price only if type is SELL
                if (type === 'SELL') {
                    formData.append('price', price);
                }

                // Add images
                imageFiles.forEach((file, index) => {
                    formData.append('images', file);
                });

                // Send request to server
                const response = await fetch('/api/items', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`
                        // Note: Don't set Content-Type header when using FormData
                        // The browser will set it automatically with the correct boundary
                    },
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to add item');
                }

                await loading.close();
                await showSuccess('Success!', 'Your item has been listed successfully!');
                window.location.href = '/my-items.html';

            } catch (error) {
                console.error('Error:', error);
                await loading.close();
                await showError('Error', error.message || 'Failed to add item. Please try again.');
            }
        });
    }
});
