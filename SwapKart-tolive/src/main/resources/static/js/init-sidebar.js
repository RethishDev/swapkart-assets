// Initialize mobile menu functionality
function initMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (!sidebar || !sidebarToggle) return;
    
    // Show/hide sidebar on mobile
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    }
    
    // Close sidebar when clicking outside on mobile
    function handleOutsideClick(event) {
        if (window.innerWidth < 992 && 
            !sidebar.contains(event.target) && 
            event.target !== sidebarToggle && 
            !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    // Initialize based on screen size
    function initSidebarState() {
        if (window.innerWidth < 992) {
            if (sidebarToggle) sidebarToggle.style.display = 'flex';
            if (sidebar) sidebar.classList.remove('active');
        } else {
            if (sidebarToggle) sidebarToggle.style.display = 'none';
            if (sidebar) sidebar.classList.add('active');
            document.body.style.overflow = '';
        }
    }
    
    // Set initial state
    initSidebarState();
    
    // Toggle sidebar when button is clicked
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }
    
    // Close when clicking outside
    document.addEventListener('click', handleOutsideClick);
    
    // Handle window resize with debounce
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initSidebarState, 250);
    });
}

// Initialize user profile data
function initUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Get username from localStorage or use default
    const username = localStorage.getItem('username') || 'User';
    const usernameElement = document.getElementById('username');
    const userAvatar = document.querySelector('.user-avatar');

    // Update username display
    if (usernameElement) {
        usernameElement.textContent = username;
    }

    // Update avatar
    if (userAvatar) {
        const encodedName = encodeURIComponent(username);
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodedName}&background=4361ee&color=fff`;
        userAvatar.alt = username;
        // Add error handler in case the image fails to load
        userAvatar.onerror = function() {
            this.src = '/images/default-avatar.png';
        };
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize user profile
    initUserProfile();
    
    // Check authentication
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;

    // Redirect to login if not authenticated and not already on login page
    if (!token && !currentPath.endsWith('login.html')) {
        window.location.href = '/login.html';
        return;
    }
});
