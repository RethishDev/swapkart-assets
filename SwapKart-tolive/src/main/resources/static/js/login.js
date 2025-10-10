// Function to handle login
async function handleLogin(email, password) {
  try {
    // Show loading state
    const loginButton = document.getElementById('loginButton');
    const originalButtonText = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
      console.log('Sending login request for email:', email);
      
      // Use the ApiClient for the login request
      const result = await ApiClient.post('/api/auth/login', { email, password });
      
      console.log('Login successful, token received');

      // Store user data in localStorage
      if (result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('username', result.fullName || result.email);
        
        // Store user data in localStorage and get the role
        const role = result.role || 'USER'; // Default to 'USER' if role is not provided
        if (result.userId) {
          localStorage.setItem('userId', result.userId);
        }
        if (role) {
          localStorage.setItem('role', role);
        }

        // Check for stored return URL
        const returnUrl = sessionStorage.getItem('returnUrl');
        
        if (returnUrl) {
            // Clear the stored URL
            sessionStorage.removeItem('returnUrl');
            // Redirect to the originally requested page
            window.location.href = returnUrl;
        } else {
            // Default redirect based on role
            redirectToDashboard(role);
        }
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      // Re-throw the error to be caught by the outer catch
      throw error;
    }
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = document.getElementById('error-message');
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        if (error.response.data && error.response.data.error) {
          // Use server-provided error message if available
          errorMessage.textContent = error.response.data.error;
        } else {
          errorMessage.textContent = 'Invalid email or password. Please try again.';
        }
      } else if (error.response.status === 403) {
        errorMessage.textContent = 'Your account is not active. Please contact support.';
      } else if (error.response.status === 429) {
        errorMessage.textContent = 'Too many login attempts. Please try again later.';
      } else {
        errorMessage.textContent = 'Login failed. Please try again later.';
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage.textContent = 'Unable to connect to the server. Please check your internet connection.';
    } else {
      // Something happened in setting up the request
      errorMessage.textContent = error.message || 'An unexpected error occurred. Please try again.';
    }
    
    errorMessage.style.display = 'block';
    
    // Reset login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Login';
    }
    
    // Hide the error message after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }
}

// Redirect helper
function redirectToDashboard(role) {
  if (role === 'ROLE_ADMIN') {
    window.location.href = 'admin-dashboard.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}

// Check for session expiration message on page load
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionExpired = urlParams.get('sessionExpired');
    const returnUrl = urlParams.get('returnUrl');
    
    if (sessionExpired === 'true') {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = 'No active user found. Please register first or login with correct credentials.';
        errorMessage.style.display = 'block';
        
        // Store return URL for after login
        if (returnUrl) {
            sessionStorage.setItem('returnUrl', returnUrl);
        }
    }
    
    // Auto-focus email field
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.focus();
    }
});

// Form submit event listener
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = 'Please enter both email and password';
    errorMessage.style.display = 'block';
    
    // Hide the error message after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
    return;
  }

  handleLogin(email, password);
});

// Show/Hide password toggle
document.getElementById('togglePassword').addEventListener('click', function() {
  const passwordField = document.getElementById('password');
  const isPassword = passwordField.type === 'password';
  passwordField.type = isPassword ? 'text' : 'password';

  // Toggle button text/icon (example: 👁 / 🚫)
  this.textContent = isPassword ? '🙈' : '👁';
});

// Check for existing session on page load
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const currentPath = window.location.pathname;

  // Redirect only if on login page and already logged in
  if (token && role && currentPath.endsWith('login.html')) {
    redirectToDashboard(role);
  }
});
