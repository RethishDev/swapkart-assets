document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const itemsTable = document.getElementById('itemsTable');
    const searchInput = document.getElementById('searchItems');
    const pagination = document.getElementById('pagination');
    let currentPage = 0;
    const pageSize = 10;
    
    // Initialize toast
    const toastEl = document.getElementById('toast');
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
    
    // Initialize tooltips
    function initTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // API base URL
    const API_BASE_URL = '/api/admin/items';
    
    // Helper function to handle API requests
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return Promise.reject('No authentication token found');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers
            });
            
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return Promise.reject('Session expired. Please login again.');
            }
            
            // For DELETE requests, return the response directly if no content
            if (options.method === 'DELETE' && response.status === 204) {
                return response;
            }
            
            // For other requests, parse the response as JSON
            const data = await response.json();
            
            if (!response.ok) {
                return Promise.reject(data.message || 'Something went wrong');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showToast(error.message || 'Failed to process request', 'error');
            throw error;
        }
    }
    
    // Load items with pagination
    async function loadItems(page = 0, search = '') {
        // Show loading state
        const tbody = itemsTable.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading items...</p>
                </td>
            </tr>
        `;

        try {
            // Build query parameters
            const params = new URLSearchParams({
                page: page,
                size: pageSize,
                sort: 'createdAt,desc'
            });
            
            if (search) {
                params.append('search', search);
            }
            
            // Fetch items from API
            const data = await fetchWithAuth(`?${params.toString()}`);
            
            if (data.content && data.content.length === 0) {
                // No items found
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                            <p class="mb-0">No items found</p>
                        </td>
                    </tr>`;
                return;
            }
            
            // Render items
            renderItems(data.content);
            
            // Render pagination
            renderPagination({
                totalPages: data.totalPages,
                totalElements: data.totalElements,
                number: data.number
            });
            
            // Initialize tooltips for action buttons
            initTooltips();
            
        } catch (error) {
            console.error('Error loading items:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load items. Please try again.
                    </td>
                </tr>
            `;
        }
    }

    // Render items table
    function renderItems(items) {
        const tbody = itemsTable.querySelector('tbody');
        
        if (!items || items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="mb-0">No items found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(item => {
            const isActive = (item.active === true || item.active === 'true');
            const isDeleted = (item.deleted === true || item.deleted === 'true');
            const toggleStatus = !isActive;
            const rowClass = isDeleted ? 'item-deleted' : '';

            // Action buttons: if deleted, disable enable button and show label
            const actionButtonHtml = isDeleted ?
                `
                <span class="deleted-label me-2">Deleted</span>
                <button class="btn btn-sm btn-secondary" disabled>
                    <i class="fas fa-ban"></i> Disabled
                </button>
                ` :
                `
                <button class="btn btn-sm ${isActive ? 'btn-disable' : 'btn-enable'}"
                        onclick="toggleItemStatus('${item.id}', ${toggleStatus}, this)">
                    <i class="fas ${isActive ? 'fa-ban' : 'fa-check'}"></i>
                    ${isActive ? 'Disable' : 'Enable'}
                </button>
                `;

            return [
                `<tr class="${rowClass}">`,
                `<td>#${item.id}</td>`,
                '<td>',
                '    <div class="d-flex align-items-center">',
                `        <div class="me-3 bg-light rounded" style="width: 40px; height: 40px;">`,
                item.images && item.images.length > 0 ? 
                    `            <img src="/uploads/items/${item.images[0].imageUrl}" class="img-fluid rounded" alt="${(item.title||'').replace(/"/g, '&quot;')}" style="width: 40px; height: 40px; object-fit: cover;">` :
                    '            <i class="fas fa-box text-muted" style="font-size: 1.5rem;"></i>',
                '        </div>',
                '        <div>',
                `            <h6 class="mb-0">${item.title ? item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Untitled Item'}</h6>`,
                `            <small class="text-muted">Posted on ${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</small>`,
                '        </div>',
                '    </div>',
                '</td>',
                `<td>${item.category ? item.category.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'N/A'}</td>`,
                `<td st>${item.type ? item.type.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'N/A'}</td>`,
                `<td>${item.sellerName ? item.sellerName.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'N/A'}</td>`,
                '<td>',
                `    <span class="badge ${isDeleted ? 'bg-danger' : (isActive ? 'bg-success' : 'bg-secondary')}">`,
                `        ${isDeleted ? 'Deleted' : (isActive ? 'Active' : 'Inactive')}`,
                '    </span>',
                '</td>',
                '<td class="text-end table-actions">',
                '    <button class="btn btn-sm btn-outline-primary view-btn me-1" ',
                `            onclick="viewItem('${item.id}')" `,
                '            data-bs-toggle="tooltip" ',
                '            data-bs-placement="top" ',
                '            title="View details">',
                '        <i class="fas fa-eye"></i> View',
                '    </button>',
                `    ${actionButtonHtml}`,
                '</td>',
                '</tr>'
            ].join('\n');
        }).join('');
        
        // Initialize tooltips for the new elements
        initTooltips();
    }

    // Render pagination
    function renderPagination(data) {
        pagination.innerHTML = '';
        const totalPages = data.totalPages;
        const currentPage = data.number;
        
        if (totalPages <= 1) return;
        
        const ul = document.createElement('ul');
        ul.className = 'pagination justify-content-center';
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 0 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>`;
        ul.appendChild(prevLi);
        
        // Page numbers
        for (let i = 0; i < totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i + 1}</a>`;
            ul.appendChild(li);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>`;
        ul.appendChild(nextLi);
        
        pagination.appendChild(ul);
    }

    // Toggle item status
    window.toggleItemStatus = async function(itemId, newStatus, button) {
        const row = button ? button.closest('tr') : null;
        const isDeleted = row ? row.classList.contains('item-deleted') : false;
        if (isDeleted && newStatus === true) {
            showToast('This item has been deleted and cannot be enabled', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to ${newStatus ? 'enable' : 'disable'} this item?`)) {
            return;
        }

        const originalText = button ? button.innerHTML : '';
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        }

        try {
            const response = await fetchWithAuth(`/${itemId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ active: newStatus })
            });

            showToast(`Item ${newStatus ? 'enabled' : 'disabled'} successfully`);

            // Update the row appearance
            if (row) {
                if (newStatus) {
                    row.classList.remove('item-disabled');
                } else {
                    row.classList.add('item-disabled');
                }
                // If the row is deleted, ensure deleted styling persists
                if (row.classList.contains('item-deleted')) {
                    // keep deleted look
                }
            }

            // Update the status badge
            if (row) {
                const statusBadge = row.querySelector('.badge');
                if (statusBadge && !row.classList.contains('item-deleted')) {
                    statusBadge.className = `badge ${newStatus ? 'bg-success' : 'bg-secondary'}`;
                    statusBadge.textContent = newStatus ? 'Active' : 'Inactive';
                }
            }

            // Update the button
            if (button && !row.classList.contains('item-deleted')) {
                const iconClass = newStatus ? 'fa-ban' : 'fa-check';
                button.className = `btn btn-sm ${newStatus ? 'btn-disable' : 'btn-enable'}`;
                button.innerHTML = `<i class="fas ${iconClass}"></i> ${newStatus ? 'Disable' : 'Enable'}`;
                button.onclick = (e) => {
                    e.preventDefault();
                    toggleItemStatus(itemId, !newStatus, button);
                };
            }

            // If there's a modal open, update the status there too
            const modalStatusBadge = document.querySelector('#viewItemModal .badge');
            if (modalStatusBadge && !modalStatusBadge.closest('.modal-body').classList.contains('item-deleted')) {
                modalStatusBadge.className = `badge ${newStatus ? 'bg-success' : 'bg-secondary'}`;
                modalStatusBadge.textContent = newStatus ? 'Active' : 'Inactive';
            }

        } catch (error) {
            console.error('Error toggling item status:', error);
            showToast(error.message || 'Failed to update item status', 'error');
        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }

    // View item details
    window.viewItem = async function(itemId) {
        // Get modal elements
        const modalEl = document.getElementById('viewItemModal');
        const modal = new bootstrap.Modal(modalEl);
        const modalBody = modalEl.querySelector('.modal-body');
        const modalButtons = document.getElementById('modalActionButtons');
        
        // Show loading state
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 mb-0">Loading item details...</p>
            </div>
        `;
        
        // Clear any existing buttons
        if (modalButtons) {
            modalButtons.innerHTML = '';
        }
        
        // Show the modal
        modal.show();
        
        try {
            // Fetch item details from API - use just the item ID since API_BASE_URL is already set
            const item = await fetchWithAuth(`/${itemId}`);
            console.log('Item details:', item); // Debug log
            
            // Update modal title
            const modalTitle = document.getElementById('viewItemModalLabel');
            if (modalTitle) {
                modalTitle.textContent = item.title || 'Item Details';
            }
            
            // Format creation date
            const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';
            
            // Build the content HTML
            let imagesHtml = '';
            if (item.imageUrls && item.imageUrls.length > 0) {
                imagesHtml = item.imageUrls.map((img, index) => `
                    <div class="carousel-item${index === 0 ? ' active' : ''}">
                        <img src="${img.startsWith('http') ? img : (img.startsWith('/') ? img : '/' + img)}" 
                             class="d-block w-100" 
                             alt="Item image ${index + 1}" 
                             onerror="this.onerror=null; this.src='/images/placeholder.jpg';"
                             style="max-height: 300px; object-fit: contain; margin: 0 auto;">
                    </div>
                `).join('');
            } else {
                imagesHtml = `
                    <div class="carousel-item active">
                        <div class="d-flex align-items-center justify-content-center" style="height: 200px;">
                            <div class="text-center">
                                <i class="fas fa-image fa-3x text-muted mb-2"></i>
                                <p class="text-muted mb-0">No images available</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Build the complete modal content
            const contentHtml = `
                <div class="row g-4">
                    <div class="col-12 col-md-6">
                        <div id="itemCarousel" class="carousel slide mb-4" data-bs-ride="carousel">
                            <div class="carousel-inner rounded" style="min-height: 300px; background-color: #f8f9fa;">
                                ${imagesHtml}
                            </div>
                            ${(item.images && item.images.length > 1) ? `
                                <button class="carousel-control-prev" type="button" data-bs-target="#itemCarousel" data-bs-slide="prev">
                                    <span class="carousel-control-prev-icon bg-dark bg-opacity-25 rounded" aria-hidden="true"></span>
                                    <span class="visually-hidden">Previous</span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#itemCarousel" data-bs-slide="next">
                                    <span class="carousel-control-next-icon bg-dark bg-opacity-25 rounded" aria-hidden="true"></span>
                                    <span class="visually-hidden">Next</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="col-12 col-md-6">
                        <h4 class="mb-3">${item.title || 'Item Details'}</h4>
                        <div class="row g-3">
                            <div class="mb-3">
                                <h6 class="text-muted mb-1">Description</h6>
                                <p class="mb-0">${item.description || 'No description provided.'}</p>
                            </div>
                            <div class="col-6">
                                <h6 class="text-muted mb-1">Category</h6>
                                <p class="mb-0">${item.category || 'N/A'}</p>
                            </div>
                            <div class="col-6">
                                <h6 class="text-muted mb-1">Type</h6>
                                <p class="mb-0" style="font-weight: bold; color: #007bff;">${item.type || 'N/A'}</p>
                            </div>
                            <div class="col-6">
                                <h6 class="text-muted mb-1">Condition</h6>
                                <p class="mb-0">${item.itemCondition || 'N/A'}</p>
                            </div>
                            <div class="col-6">
                                <h6 class="text-muted mb-1">Status</h6>
                                <p class="mb-0">
                                    <span class="badge bg-${(item.active === true || item.active === 'true') ? 'success' : 'secondary'}">
                                        ${(item.active === true || item.active === 'true') ? 'Active' : 'Inactive'}
                                    </span>
                                </p>
                            </div>
                            <div class="col-6">
                                <h6 class="text-muted mb-1">Posted by</h6>
                                <p class="mb-0">${item.sellerName || 'N/A'}</p>
                            </div>
                            <div class="col-6">
                                <h6 class="text-muted mb-1">Date Posted</h6>
                                <p class="mb-0">${createdAt}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Update modal content
            modalBody.innerHTML = contentHtml;

            // If item is deleted, show deleted label and disable enable action
            if (item.deleted === true || item.deleted === 'true') {
                const header = modalEl.querySelector('.modal-header');
                if (header) {
                    const delLabel = document.createElement('span');
                    delLabel.className = 'deleted-label ms-2';
                    delLabel.textContent = 'Deleted';
                    header.appendChild(delLabel);
                }
            }

            // Create and add delete button if modalButtons exists
            if (modalButtons) {
                // If item is deleted, don't show enable; just show a disabled button
                if (item.deleted === true || item.deleted === 'true') {
                    const disabledBtn = document.createElement('button');
                    disabledBtn.className = 'btn btn-secondary';
                    disabledBtn.disabled = true;
                    disabledBtn.textContent = 'Deleted';
                    modalButtons.appendChild(disabledBtn);
                } else {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-danger';
                    deleteBtn.innerHTML = '<i class="fas fa-trash me-1"></i> Delete Item';
                    deleteBtn.onclick = () => deleteItem(item.id, item.title || 'this item');

                    modalButtons.appendChild(deleteBtn);
                }
            }

            // Initialize tooltips in the modal
            initTooltips();
            
        } catch (error) {
            console.error('Error loading item details:', error);
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load item details. ${error.message || 'Please try again later.'}
                    </div>
                `;
            }
        }
    };

    // Show toast notification
    function showToast(message, type = 'success') {
        const toastEl = document.getElementById('toast');
        const toastTitle = document.getElementById('toast-title');
        const toastBody = document.getElementById('toast-message');
        
        // Set toast type and message
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastTitle.textContent = type === 'success' ? 'Success' : 'Error';
        toastBody.textContent = message;
        
        // Show the toast
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
        toast.show();
    }

    // Initialize the page
    loadItems();
    
    // Add event listener for search input
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadItems(0, this.value);
        }, 500);
    });
    
    // Initialize tooltips on page load
    initTooltips();
    
    // Handle logout
    window.handleLogout = function() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    };
    
    // Make functions available globally
    window.changePage = function(page) {
        currentPage = page;
        loadItems(page, searchInput.value);
    };
    
    // Function to delete an item
    async function deleteItem(itemId, itemName) {
        if (!confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            console.log('Attempting to delete item with ID:', itemId);
            const response = await fetch(`${API_BASE_URL}/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            console.log('Delete response status:', response.status);
            
            if (!response.ok) {
                let errorMessage = 'Failed to delete item';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                    console.error('Error details:', errorData);
                } catch (e) {
                    console.error('Failed to parse error response');
                }
                throw new Error(errorMessage);
            }

            // Parse the successful response
            const result = await response.json();
            console.log('Delete successful:', result);
            
            showToast(result.message || 'Item deleted successfully', 'success');
            
            // Close the modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewItemModal'));
            if (modal) {
                modal.hide();
            }
            
            // Refresh the items list
            loadItems(currentPage, searchInput.value);
            
        } catch (error) {
            console.error('Error deleting item:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            showToast(`Error: ${error.message || 'Failed to delete item. Please try again.'}`, 'error');
        }
    }

    // Initialize tooltips when the modal is shown
    const viewItemModal = document.getElementById('viewItemModal');
    if (viewItemModal) {
        viewItemModal.addEventListener('shown.bs.modal', function () {
            initTooltips();
        });
    }
});
