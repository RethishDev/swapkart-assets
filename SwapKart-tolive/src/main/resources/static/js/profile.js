// Show toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (toast && toastMsg) {
        toastMsg.textContent = message;
        toast.className = `toast align-items-center text-white ${isError ? 'bg-danger' : 'bg-primary'} border-0 show`;
        setTimeout(() => toast.className = toast.className.replace('show', ''), 3000);
    } else {
        console.log(message);
    }
}

// Toggle password visibility
function setupPasswordToggle() {
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#password');

    if (togglePassword && password) {
        togglePassword.addEventListener('click', function (e) {
            // Toggle the type attribute
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);

            // Toggle the eye / eye-slash icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
}

// Load user profile data
async function loadUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login to view your profile', true);
        setTimeout(() => window.location.href = '/login.html', 1000);
        return;
    }

    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showToast('Session expired. Please login again.', true);
                setTimeout(() => window.location.href = '/login.html', 1500);
                return;
            }
            throw new Error('Failed to load profile');
        }

        const user = await response.json();
        populateProfileForm(user);

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile. Please try again.', true);
    }
}

// Populate form with user data
function populateProfileForm(user) {
    const fields = {
        'name': 'name',
        'email': 'email',
        'contact': 'contact',
        'city': 'city'
    };

    Object.entries(fields).forEach(([apiField, formField]) => {
        const element = document.getElementById(formField);
        if (element && user[apiField] !== undefined) {
            element.value = user[apiField] || '';
        }
    });
}

// Handle form submission
function setupFormSubmit() {
    const form = document.getElementById('profileForm');
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form values
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const contact = document.getElementById('contact').value.trim();
        const city = document.getElementById('city').value.trim();
        const password = document.getElementById('password').value.trim();

        // Validation
        if (!name) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Name is required',
                confirmButtonColor: '#4361ee'
            });
            return;
        }

        if (name.length < 2 || name.length > 50) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Name must be between 2 and 50 characters',
                confirmButtonColor: '#4361ee'
            });
            return;
        }

        if (!email) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Email is required',
                confirmButtonColor: '#4361ee'
            });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please enter a valid email address',
                confirmButtonColor: '#4361ee'
            });
            return;
        }

        if (!contact) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Contact number is required',
                confirmButtonColor: '#4361ee'
            });
            return;
        }

        const contactRegex = /^[0-9]{10}$/;
        if (!contactRegex.test(contact)) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Contact must be a 10-digit number',
                confirmButtonColor: '#4361ee'
            });
            return;
        }

        if (password && password.length < 6) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Password must be at least 6 characters long',
                confirmButtonColor: '#4361ee'
            });
            return;
        }

        try {
            const originalText = submitBtn?.innerHTML;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
            }

            const data = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                contact: document.getElementById('contact').value,
                city: document.getElementById('city').value
            };

            // Only include password if it's not empty
            const password = document.getElementById('password').value;
            if (password) {
                data.password = password;
            }

            const token = localStorage.getItem('token');
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                let errorMsg = 'Failed to update profile';
                if (result.message) {
                    errorMsg = result.message;
                } else if (result.error) {
                    errorMsg = result.error;
                } else if (result.errors) {
                    errorMsg = Object.values(result.errors).join('\n');
                }
                throw new Error(errorMsg);
            }

            // Show success message with SweetAlert
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Profile updated successfully!',
                confirmButtonColor: '#4361ee',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            });

            // Refresh the profile data
            await loadUserProfile();

            // Reset form and button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText || 'Update Profile';
            }

            // Reload the page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error updating profile:', error);
            
            // Show error message with SweetAlert
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to update profile. Please try again.',
                confirmButtonColor: '#4361ee'
            });
            
            // Enhanced error logging
            if (error.response) {
                try {
                    const errorData = await error.response.json();
                    console.error('Response status:', error.response.status);
                    console.error('Response error:', errorData);
                    
                    let errorMessage = 'Failed to update profile';
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    } else if (errorData.errors) {
                        // If there are validation errors, format them
                        errorMessage = Object.entries(errorData.errors)
                            .map(([field, message]) => `${field}: ${message}`)
                            .join('\n');
                    }
                    
                    // Show detailed error in console
                    console.error('Detailed error:', errorMessage);
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                }
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    });
}

// Initialize the profile page
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    setupFormSubmit();
    setupPasswordToggle();
});
