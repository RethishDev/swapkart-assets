document.addEventListener('DOMContentLoaded', function() {
    const usersTable = document.getElementById('usersTable');
    const searchInput = document.getElementById('searchUsers');
    const pagination = document.getElementById('pagination');
    let currentPage = 0;
    const pageSize = 10;
    let totalUsers = 0; // total users returned by server

    // Load users with pagination
    function loadUsers(page = 0, search = '') {
        const token = localStorage.getItem('token');
        let url = `/api/admin/users?page=${page}&size=${pageSize}`;

        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(async data => {
            // update totalUsers for pagination
            totalUsers = data.totalElements || (data.totalElements === 0 ? 0 : totalUsers);
            await renderUsers(data.content);
            renderPagination(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error loading users', 'error');
        });
    }

    // Render users table (async because we fetch ratings for each user)
    async function renderUsers(users) {
        const tbody = usersTable.querySelector('tbody');
        tbody.innerHTML = '';

        if (!Array.isArray(users) || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">No users found</td></tr>`;
            return;
        }

        // Fetch ratings for all users in parallel (one call per user for avg + count)
        const token = localStorage.getItem('token');

        const ratingPromises = users.map(async (user) => {
            const result = { average: null, count: 0 };
            try {
                const [avgResp, countResp] = await Promise.all([
                    fetch(`/api/ratings/user/${user.id}/average`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`/api/ratings/user/${user.id}/count`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (avgResp.ok) {
                    const avg = await avgResp.json();
                    result.average = avg;
                }
                if (countResp.ok) {
                    const cnt = await countResp.json();
                    result.count = cnt || 0;
                }
            } catch (e) {
                // Ignore rating errors per user to avoid breaking the whole table
                console.warn('Error fetching ratings for user', user.id, e);
            }
            return { userId: user.id, ...result };
        });

        const ratingsForUsers = await Promise.all(ratingPromises);
        const ratingsMap = new Map(ratingsForUsers.map(r => [r.userId, { average: r.average, count: r.count }]));

        users.forEach(user => {
            const ratingInfo = ratingsMap.get(user.id) || { average: null, count: 0 };
            const avg = ratingInfo.average != null ? Number(ratingInfo.average).toFixed(1) : '0.0';
            const count = ratingInfo.count || 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${user.id}</td>
                <td>${user.name || ''}</td>
                <td>${user.email || ''}</td>
                <td>${user.role || ''}</td>
                <td>
                    <span class="status ${user.active ? 'approved' : 'pending'}">
                        ${user.active ? 'Active' : 'Blocked'}
                    </span>
                </td>
                <td>
                    <div class="rating-badge">
                        <span class="rating-score">${avg}</span>
                        <span class="text-muted small">(${count})</span>
                        <button class="btn btn-sm btn-link p-0 ms-2" onclick="showReviews(${user.id})">View reviews</button>
                    </div>
                </td>
                <td>
                    <button class="btn small edit me-1" data-user-id="${user.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${user.role !== 'ROLE_ADMIN' ?
                        `<button class="btn small danger"
                                onclick="deleteUser(${user.id}, this)">
                            <i class="fas fa-trash"></i> Delete
                        </button>` : ''
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Render pagination
    function renderPagination(data) {
        pagination.innerHTML = '';
        const totalPages = data.totalPages;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 0 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>`;
        pagination.appendChild(prevLi);

        // Page numbers
        for (let i = 0; i < totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i + 1}</a>`;
            pagination.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>`;
        pagination.appendChild(nextLi);
    }

    // Delete user
    window.deleteUser = async function(userId, button) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            const token = localStorage.getItem('token');
            const originalHtml = button.innerHTML;
            
            try {
                // Show loading state
                button.disabled = true;
                button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
                
                console.log('Sending DELETE request to:', `/api/admin/users/${userId}`);
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin' // Include cookies if needed
                });

                if (!response.ok) {
                    let errorMessage = `HTTP error! status: ${response.status}`;
                    try {
                        const errorData = await response.text();
                        if (errorData) {
                            errorMessage += ` - ${errorData}`;
                        }
                    } catch (e) {
                        console.error('Error parsing error response:', e);
                    }
                    throw new Error(errorMessage);
                }

                showToast('User deleted successfully', 'success');
                loadUsers(currentPage, searchInput.value);
            } catch (error) {
                console.error('Error:', error);
                showToast(error.message || 'Error deleting user', 'error');
                button.disabled = false;
                button.innerHTML = originalHtml;
            }
        }
    };

    // Show reviews modal for a user
    window.showReviews = async function(userId) {
        const token = localStorage.getItem('token');
        const reviewsContainer = document.getElementById('reviewsContainer');
        reviewsContainer.innerHTML = '<div class="text-center text-muted">Loading reviews...</div>';

        try {
            const response = await fetch(`/api/ratings/for-user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch reviews');
            }

            const reviews = await response.json();

            if (!Array.isArray(reviews) || reviews.length === 0) {
                reviewsContainer.innerHTML = '<div class="text-center text-muted">No reviews yet</div>';
            } else {
                const html = reviews.map(r => `
                    <div class="review-item d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${escapeHtml(r.raterName || r.raterId)}</div>
                            <div class="text-muted small">${escapeHtml(r.comment || '')}</div>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold">${r.score}</div>
                            <div class="text-muted small">${formatDate(r.createdAt)}</div>
                        </div>
                    </div>
                `).join('');
                reviewsContainer.innerHTML = `<div class="reviews-list">${html}</div>`;
            }

            const modal = new bootstrap.Modal(document.getElementById('reviewsModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading reviews:', error);
            reviewsContainer.innerHTML = '<div class="text-center text-danger">Error loading reviews</div>';
            const modal = new bootstrap.Modal(document.getElementById('reviewsModal'));
            modal.show();
        }
    };

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatDate(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return d.toLocaleString();
        } catch (e) {
            return iso;
        }
    }

    // Edit user - Show modal with user details
    window.editUser = async function(userId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch user details');

            const user = await response.json();

            // Populate the form
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editName').value = user.name || '';
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editRole').value = user.role || 'ROLE_USER';

            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();


        } catch (error) {
            console.error('Error:', error);
            showToast('Error loading user details', 'error');
        }
    };

    // Initialize modal event listeners
    const editUserModal = document.getElementById('editUserModal');
    if (editUserModal) {
        editUserModal.addEventListener('hidden.bs.modal', function () {
            // Clear the form when modal is closed
            document.getElementById('editUserForm').reset();
            
            // Remove any existing error messages
            const errorAlerts = editUserModal.querySelectorAll('.alert');
            errorAlerts.forEach(alert => alert.remove());
            
            // Re-enable the save button if it was disabled
            const saveBtn = document.getElementById('saveUserChanges');
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        });
    }

    // Save user changes
    document.getElementById('saveUserChanges').addEventListener('click', async function() {
        const saveBtn = this;
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        const userId = document.getElementById('editUserId').value;
        const name = document.getElementById('editName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const role = document.getElementById('editRole').value;

        if (!name || !email || !role) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    role: role
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update user');
            }

            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            modal.hide();
            
            // Reset button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;

            // Refresh the users list
            loadUsers(currentPage, searchInput.value);
            showToast('User updated successfully', 'success');

        } catch (error) {
            console.error('Error:', error);
            showToast(error.message || 'Error updating user', 'error');
            
            // Reset button state on error
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    });

    // Change page
    window.changePage = function(page) {
        const totalPages = Math.ceil((totalUsers || 0) / pageSize);
        if (page >= 0 && page < totalPages) {
            currentPage = page;
            loadUsers(currentPage, searchInput.value);
        }
    };

    // Search users
    searchInput.addEventListener('input', debounce(() => {
        currentPage = 0;
        loadUsers(currentPage, searchInput.value);
    }, 300));

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Initial load
    loadUsers();

    // Add event delegation for edit buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit')) {
            const userId = e.target.getAttribute('data-user-id');
            if (userId) {
                editUser(parseInt(userId));
            }
        }
    });
});

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('token');
    showToast('Logged out successfully', 'success');
    window.location.href = '/login';
}