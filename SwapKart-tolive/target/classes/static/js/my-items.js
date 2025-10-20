// Global variables
let currentItemId = null;
let itemsData = [];

// DOM Elements
const loadingAnimation = document.getElementById('loadingAnimation');
const mainContent = document.querySelector('.main-content');
const itemsContainer = document.getElementById('itemsContainer');
const emptyState = document.getElementById('emptyState');
const deleteModal = document.getElementById('deleteModal');
const editItemModal = document.getElementById('editItemModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelDelete = document.getElementById('cancelDelete');
const cancelEdit = document.getElementById('cancelEdit');
const confirmDelete = document.getElementById('confirmDelete');
const editItemForm = document.getElementById('editItemForm');

function showLoading() {
    const loadingAnimation = document.getElementById('loadingAnimation');
    if (loadingAnimation) {
        loadingAnimation.classList.add("visible");
        loadingAnimation.classList.remove("hidden");
    }
}

function hideLoading() {
    const loadingAnimation = document.getElementById('loadingAnimation');
    if (loadingAnimation) {
        loadingAnimation.classList.remove("visible");
        loadingAnimation.classList.add("hidden");
    }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');

            // Toggle between menu and close icon
            const icon = menuToggle.querySelector('i');
            if (menuToggle.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
                document.body.style.overflow = 'hidden';
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
                document.body.style.overflow = 'auto';
            }
        });

        // Close menu when clicking on a nav link
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    mainNav.classList.remove('active');
                    menuToggle.classList.remove('active');
                    const icon = menuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    document.body.style.overflow = 'auto';
                }
            });
        });
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', init);

if (closeDeleteModal) closeDeleteModal.addEventListener('click', () => hideModal(deleteModal));
if (cancelDelete) cancelDelete.addEventListener('click', () => hideModal(deleteModal));
if (cancelEdit) cancelEdit.addEventListener('click', () => hideModal(editItemModal));

// Initialize the application
function init() {
    console.log('Initializing application...');

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found, redirecting to login...');
        window.location.href = '/login.html';
        return;
    }

    try {
        // Set up user info in header
        setupUserInfo();

        // Set up logout functionality
        setupLogout();

        // Set up form submission handler for edit form
        const editForm = document.getElementById('editItemForm');
        if (editForm) {
            editForm.addEventListener('submit', handleEditSubmit);
        }

        // Set up delete confirmation
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', handleDelete);
        }

        // Show loading animation
        showLoading();

        // Load user's items
        console.log('Loading user items...');
        loadUserItems();

        // Initialize message badge
        updateMessagesBadge();
        setInterval(updateMessagesBadge, 30000);

    } catch (error) {
        console.error('Error initializing application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Set up user information in the header
async function setupUserInfo() {
    const username = localStorage.getItem('username') || 'User';
    const usernameElement = document.getElementById('username');
    const userAvatar = document.querySelector('.user-avatar');

    if (usernameElement) usernameElement.textContent = username;
    if (userAvatar) {
        const encodedName = encodeURIComponent(username);
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodedName}&background=4361ee&color=fff`;
        userAvatar.alt = username;
    }
}

// Set up logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            handleLogout();
        });
    }
}

// Load user's items
async function loadUserItems() {
    // Show loading animation immediately
    showLoading();

    const token = localStorage.getItem('token');
    if (!token) {
        hideLoading();
        window.location.href = '/login.html';
        return;
    }

    try {
        console.log('Fetching user items...');

        // Set up pagination parameters
        const page = 0; // First page
        const size = 50; // Number of items per page
        const sort = 'createdAt,desc'; // Sort by creation date, newest first

        // Build query parameters
        const queryParams = new URLSearchParams({
            page: page,
            size: size,
            sort: sort
        }).toString();

        // Use Promise.all to ensure minimum loading time of 1 second
        const [response] = await Promise.all([
            fetch(`/api/items/my-items?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include' // Include cookies in the request
            }),
            new Promise(resolve => setTimeout(resolve, 1000)) // Minimum loading time
        ]);

        if (!response.ok) {
            let errorMessage = 'Failed to load items';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                console.error('API Error:', errorData);
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Received items data:', data);

        // Handle paginated response
        itemsData = data.content || [];
        console.log('Processed items:', itemsData);

        // Show empty state if no items
        if (itemsData.length === 0) {
            console.log('No items found');
            emptyState.style.display = 'block';
            itemsContainer.style.display = 'none';
        } else {
            console.log(`Found ${itemsData.length} items`);
            emptyState.style.display = 'none';
            itemsContainer.style.display = 'grid';
            renderItems(itemsData);
        }

        // Hide loading with a small delay for smoother transition
        setTimeout(hideLoading, 300);

    } catch (error) {
        console.error('Error loading items:', error);
        showError(error.message || 'An error occurred while loading items');
        hideLoading();
    }
}

// Render items in the grid
function renderItems(items) {
      if (!items || items.length === 0) {
          itemsContainer.style.display = 'none';
          emptyState.style.display = 'block';
          return;
      }

      itemsContainer.style.display = 'grid';
      emptyState.style.display = 'none';
      itemsContainer.innerHTML = '';

      items.forEach(item => {
          const card = document.createElement('div');

          // If the item was deleted by the user (soft-delete by owner), do not render it
          if (item.deleted === true && (item.deletedByAdmin === false || item.deletedByAdmin == null)) {
              // Skip rendering user-deleted items (they should not appear in My Items)
              return;
          }

          // Determine admin-deleted vs admin-disabled vs normal
          const isAdminDeleted = item.deleted === true && item.deletedByAdmin === true;

          // isDisabled should reflect items that are inactive/disabled but not admin-deleted
          const isDisabled = !isAdminDeleted && (item.active === false || item.active === 'false' || item.active === 'f');

          card.className = `item-card ${isDisabled || isAdminDeleted ? 'item-disabled' : ''}`;

          const imageUrl = (item.imageUrls && item.imageUrls.length > 0)
              ? item.imageUrls[0]
              : 'https://via.placeholder.com/300x200?text=No+Image';

          // Format the type to be more readable (e.g., 'SELL' -> 'Sell')
          const formattedType = item.type ?
              item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase() :
              'N/A';

          // Format the category to be more readable (e.g., 'ELECTRONICS' -> 'Electronics')
          const formattedCategory = item.category ?
              item.category.split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ') :
              'N/A';

          // Build banner HTML depending on state
          let stateBannerHtml = '';
          if (isAdminDeleted) {
              stateBannerHtml = `
                  <div class="admin-deleted-banner" style="background:#ffe6e6;color:#a00;padding:8px;border-radius:6px;margin-bottom:8px;font-weight:600;">
                      🗑️ DELETED BY ADMIN - This item has been removed by an administrator and is no longer available.
                  </div>
              `;
          } else if (isDisabled) {
              stateBannerHtml = `
                  <div class="admin-disabled-banner">
                      <marquee behavior="scroll" onmouseover="this.stop()" onmouseout="this.start()" direction="left" scrollamount="3">
                          🚫 ADMIN DISABLED - This item is currently unavailable to all users
                      </marquee>
                  </div>
              `;
          }

          // Determine attributes for action buttons
          const editDisabledAttr = (isDisabled || isAdminDeleted) ? 'disabled' : '';
          const deleteHiddenAttr = isAdminDeleted ? 'hidden' : ''; // hide delete for admin-deleted items

          card.innerHTML = `
              <img src="${imageUrl}" alt="${item.title}" class="item-image">
              <div class="item-details">
                  ${stateBannerHtml}
                  <div class="item-header">
                      <h3 class="item-title">${item.title}</h3>
                      <span class="item-type ${item.type ? item.type.toLowerCase() : ''}">
                          ${formattedType}
                      </span>
                  </div>
                  <p class="item-category">
                      <i class="fas fa-tag"></i> ${formattedCategory}
                  </p>
                  <p class="item-description">${item.description || 'No description provided'}</p>
                  <div class="item-meta">
                      <span class="item-location">
                          <i class="fas fa-map-marker-alt"></i> ${item.city || 'N/A'}
                      </span>
                      <div class="item-actions">
                          <button class="action-btn edit-btn" data-id="${item.id}" title="Edit Item" ${editDisabledAttr}>
                              <i class="fas fa-edit"></i> ${isAdminDeleted ? 'Edit (Unavailable)' : (isDisabled ? 'Edit (Disabled)' : 'Edit')}
                          </button>
                          <button class="action-btn delete-btn" data-id="${item.id}" title="Delete Item" ${deleteHiddenAttr}>
                              <i class="fas fa-trash"></i> Delete
                          </button>
                      </div>
                  </div>
              </div>
          `;

          // Rest of your event listeners...
          const editBtn = card.querySelector('.edit-btn');
          const deleteBtn = card.querySelector('.delete-btn');

          if (editBtn) {
              editBtn.addEventListener('click', () => openEditModal(item));
          }

          if (deleteBtn) {
              deleteBtn.addEventListener('click', () => openDeleteModal(item.id));
          }

          itemsContainer.appendChild(card);
      });
  }

// Open edit modal with item data
function openEditModal(item) {
    currentItemId = item.id;

    // Populate form fields
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editTitle').value = item.title || '';
    document.getElementById('editDescription').value = item.description || '';
    document.getElementById('editCategory').value = item.category || '';
    document.getElementById('editCity').value = item.city || '';
    document.getElementById('editPincode').value = item.pincode || '';

    // Set the condition value if it exists, otherwise default to 'GOOD'
    const conditionSelect = document.getElementById('editCondition');
    if (conditionSelect) {
        conditionSelect.value = item.condition || 'GOOD';
    }

    // Show modal
    showModal(editItemModal);
}

// Handle edit form submission
async function handleEditSubmit(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('/login.html');
        return;
    }

    // Get form values
    const itemData = {
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        category: document.getElementById('editCategory').value,
        city: document.getElementById('editCity').value,
        pincode: document.getElementById('editPincode').value,
        condition: document.getElementById('editCondition').value,
        type: 'SELL' // Default type, adjust as needed
    };

    try {
        showLoading();

        const response = await fetch(`/api/items/${currentItemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update item');
        }

        // Refresh the items list
        await loadUserItems();
        hideModal(editItemModal);
        showSuccess('Item updated successfully');
    } catch (error) {
        console.error('Error updating item:', error);
        showError(error.message || 'Failed to update item. Please try again.');
    } finally {
        hideLoading();
    }
}

// Open delete confirmation modal
function openDeleteModal(itemId) {
    currentItemId = itemId;
    showModal(deleteModal);
}

// Handle item deletion
async function handleDelete() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('/login.html');
        return;
    }

    try {
        const response = await fetch(`/api/items/${currentItemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete item');
        }

        // Remove the item from the UI
        const itemElement = document.querySelector(`[data-id="${currentItemId}"]`);
        if (itemElement) {
            itemElement.closest('.item-card').remove();
        }

        // Refresh the items list
        await loadUserItems();
        hideModal(deleteModal);
        showSuccess('Item deleted successfully');
    } catch (error) {
        showError(error.message || 'Failed to delete item');
        console.error('Error deleting item:', error);
    }
}

// Show modal
function showModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Hide modal
function hideModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Show success message
function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

// Show error message
function showError(message) {
    // You can implement a more sophisticated error display
    alert(`Error: ${message}`);
}

// Handle user logout
function handleLogout() {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('username');

    // Redirect to login page
    window.location.href = '/login.html';
}

// Message Badge Functions
function updateMessagesBadge() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/messages/unread/count', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const badge = document.querySelector('.message-badge');
        if (badge) {
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    })
    .catch(error => console.error('Error fetching unread count:', error));
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        hideModal(deleteModal);
    }
    if (e.target === editItemModal) {
        hideModal(editItemModal);
    }
});
