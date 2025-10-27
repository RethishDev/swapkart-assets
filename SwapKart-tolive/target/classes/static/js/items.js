// DOM Elements
    const itemsGrid = document.getElementById('itemsGrid');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const searchInput = document.getElementById('searchQuery');
    const itemTypeSelect = document.getElementById('itemType');
    const itemCategorySelect = document.getElementById('itemCategory');
    const itemCitySelect = document.getElementById('itemCity');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const pagination = document.getElementById('pagination');

    // Pagination
    let currentPage = 0;
    const itemsPerPage = 12;
    let totalItems = 0;

    // Filters
    let filters = {
        query: '',
        type: '',
        category: '',
        city: ''
    };

    // Function to fetch and update user rating
    async function updateUserRating() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No authentication token found');
                return;
            }

            console.log('Fetching user rating with token:', token.substring(0, 10) + '...');
            const response = await fetch('/api/ratings/user-rating', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin' // Include cookies if using session-based auth
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to fetch user rating: ${response.status} ${response.statusText}`, errorText);
                return;
            }

            const ratingData = await response.json();
            const ratingElement = document.getElementById('rating');
            const ratingCountElement = document.getElementById('ratingCount');

            // Use null/undefined check so 0.0 is treated as a valid rating
            if (ratingData && ratingData.averageRating != null) {
                ratingElement.textContent = parseFloat(ratingData.averageRating).toFixed(1);
                const reviewText = ratingData.ratingCount === 1 ? 'review' : 'reviews';
                if (ratingCountElement) {
                    ratingCountElement.textContent = `Based on ${ratingData.ratingCount} ${reviewText}`;
                }

                // Update star color based on rating (select a star within a known container)
                const starIcon = document.querySelector('#rating + .ms-2 .fa-star') || document.querySelector('.user-rating .fa-star');
                if (starIcon) {
                    starIcon.className = 'fas fa-star text-warning';
                }
            }
        } catch (error) {
            console.error('Error updating user rating:', error);
        }
    }

    // Function to update quick stats
    async function updateQuickStats() {
        try {
            const response = await fetch('/api/items/counts');
            if (!response.ok) {
                throw new Error('Failed to fetch item counts');
            }
            const counts = await response.json();

            // Update the UI with the counts
            document.getElementById('swapItems').textContent = counts.swap || 0;
            document.getElementById('saleItems').textContent = counts.sell || 0;
            document.getElementById('wantedItems').textContent = counts.donate || 0;

            // Update available items count (is_available = true)
            const totalEl = document.getElementById('totalItemsCount');
            if (totalEl) {
                // counts.availableCount expected from backend
                totalEl.textContent = (counts.availableCount != null) ? counts.availableCount : (counts.count || 0);
            }

            // Update active trades count
            const activeTradesEl = document.getElementById('activeTrades');
            if (activeTradesEl) activeTradesEl.textContent = counts.activeTrades || 0;

            // Update user rating
            await updateUserRating();

        } catch (error) {
            console.error('Error updating quick stats:', error);
            // Don't show error to user as it's not critical
        }
    }

    // Initialize the page
    document.addEventListener('DOMContentLoaded', () => {
        try {
            // Update user rating on page load if user is logged in
            if (localStorage.getItem('token')) {
                updateUserRating();
            }
            // Initialize with safe defaults if elements don't exist
            if (searchInput) {
                searchInput.value = '';
                searchInput.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') {
                        applyFilters();
                    }
                });
            }

            // Load quick stats
            updateQuickStats();

            if (applyFiltersBtn) {
                applyFiltersBtn.addEventListener('click', applyFilters);
            }

            if (resetFiltersBtn) {
                resetFiltersBtn.addEventListener('click', resetFilters);
            }

            // Load data
            loadFiltersFromStorage();
            loadCategories();
            loadCities();
            loadItems();
            loadUnreadCount();

            // Update quick stats every 5 minutes
            setInterval(updateQuickStats, 5 * 60 * 1000);
        } catch (error) {
            console.error('Initialization error:', error);
            if (typeof showError === 'function') {
                showError('Failed to initialize page. Please refresh and try again.');
            }
        }
    });

    // Show loading spinner
    function showLoadingSpinner() {
        try {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error showing loading spinner:', error);
        }
    }

    // Hide loading spinner
    function hideLoadingSpinner() {
        try {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error hiding loading spinner:', error);
        }
    }

    // Show error message
    function showError(message) {
        itemsGrid.innerHTML = `
            <div class="no-items">
                <i class="fas fa-exclamation-triangle text-danger mb-3" style="font-size: 2rem;"></i>
                <p class="text-danger">${message}</p>
                <button class="btn btn-primary mt-2" onclick="loadItems()">
                    <i class="fas fa-sync-alt me-2"></i>Try Again
                </button>
            </div>
        `;
    }

    // Load items from API
    async function loadItems() {
        showLoadingSpinner();

        const queryParams = new URLSearchParams({
            page: currentPage,
            size: itemsPerPage,
            query: filters.query || '',
            type: filters.type || '',
            category: filters.category || '',
            city: filters.city || ''
        }).toString();

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        try {
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const [countResponse, itemsResponse] = await Promise.all([
                fetch(`/api/items/count?${queryParams}`, { headers }),
                fetch(`/api/items/search?${queryParams}`, { headers })
            ]);

            // Handle 401 Unauthorized
            if (countResponse.status === 401 || itemsResponse.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html?sessionExpired=true';
                return;
            }

            if (!countResponse.ok || !itemsResponse.ok) {
                const errorText = await countResponse.text() || await itemsResponse.text();
                throw new Error(`Failed to fetch items: ${errorText}`);
            }

            const [countData, itemsResponseData] = await Promise.all([
                countResponse.json(),
                itemsResponse.json()
            ]);

            // Extract items from paginated response
            const itemsData = itemsResponseData.content || [];

            // Update total items count in the UI
            totalItems = itemsResponseData.totalElements || (countData && countData.count) || 0;
            // const totalItemsElement = document.getElementById('totalItemsCount');
            // if (totalItemsElement) {
            //     totalItemsElement.textContent = totalItems;
            //     console.log('Total items updated in UI:', totalItems);
            // }

            displayItems(itemsData);
            updatePagination();
        } catch (error) {
            console.error('Error loading items:', error);
            showError(error.message || 'Failed to load items. Please try again.');
        } finally {
            hideLoadingSpinner();
        }
    }

    // Display items in the grid
    function displayItems(items) {
        console.log('Displaying items:', items); // Log the items data

        // Ensure items is an array
        const itemsArray = Array.isArray(items) ? items : (items && items.content ? items.content : []);

        if (!itemsArray || itemsArray.length === 0) {
            itemsGrid.innerHTML = `
                <div class="no-items">
                    <i class="fas fa-box-open fa-2x mb-3"></i>
                    <p>No items found matching your criteria</p>
                    <button class="btn btn-outline-primary mt-2" onclick="resetFilters()">
                        <i class="fas fa-filter me-2"></i>Clear Filters
                    </button>
                </div>
            `;
            return;
        }

        const itemsHTML = itemsArray.map(item => {
            // Check if item is disabled
            const isDisabled = item.active === 'false' || item.active === false || item.active === 'f';

            return `
            <div class="item-card ${isDisabled ? 'item-disabled' : ''}" data-id="${item.id}">
                <div class="position-relative">
                    ${isDisabled ? `
                    <div class="unavailable-badge">
                        <i class="fas fa-ban me-1"></i> Unavailable
                    </div>` : ''}
                    <img src="${item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0PgogIDx0ZXh0IHg9IjUwJSIgeT0iNjUlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjMwMHgxNTA8L3RleHQ+Cjwvc3ZnPg=='}"
                         class="item-img ${isDisabled ? 'img-disabled' : ''}"
                         alt="${item.title}"
                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0PgogIDx0ZXh0IHg9IjUwJSIgeT0iNjUlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjMwMHgxNTA8L3RleHQ+PC9zdmc+';"
                    >
                    <span class="item-badge ${getBadgeClass(item.type)} ${isDisabled ? 'bg-secondary' : ''}">
                        ${formatItemType(item.type)}
                    </span>
                </div>
                <div class="p-3">
                    <h5 class="mb-1">${item.title}</h5>
                    <p class="text-muted mb-2 small">
                        <i class="fas fa-tag me-1"></i>${item.category || 'No category'}
                    </p>
                    <p class="mb-2 text-truncate-2" style="-webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; display: -webkit-box;">
                        ${item.description || 'No description available'}
                    </p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>${item.city || 'N/A'}
                        </span>
                        <span class="fw-bold">
                            ${item.type === 'SELL' ? `₹${Number(item.price || 0).toLocaleString('en-IN')}` :
                              item.type === 'DONATE' ? 'Free' : 'For Swap'}
                        </span>
                    </div>
                    <button class="btn btn-sm ${isDisabled ? 'btn-outline-secondary' : 'btn-outline-primary'} w-100 mt-2"
                            onclick="${isDisabled ? 'showUnavailableToast()' : `showItemDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})`}"
                            ${isDisabled ? 'disabled' : ''}>
                        <i class="fas ${isDisabled ? 'fa-eye-slash' : 'fa-eye'} me-1"></i> ${isDisabled ? 'Unavailable' : 'View Details'}
                    </button>
                </div>
            </div>`;
        }).join('');

        itemsGrid.innerHTML = itemsHTML;
    }

    // Update pagination
    function updatePagination() {
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

        const maxVisiblePages = 5;
        let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(0, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i + 1}</a>
                </li>
            `;
        }

        paginationHTML += `
            <li class="page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    }

    // Change page
    function changePage(page) {
        if (page < 0 || page >= Math.ceil(totalItems / itemsPerPage)) {
            return;
        }
        currentPage = page;
        loadItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Apply filters
    function applyFilters() {
        filters = {
            query: searchInput.value.trim(),
            type: itemTypeSelect.value,
            category: itemCategorySelect.value,
            city: itemCitySelect.value
        };

        saveFiltersToStorage();
        currentPage = 0;
        loadItems();
    }

    // Reset filters
    function resetFilters() {
        searchInput.value = '';
        itemTypeSelect.value = '';
        itemCategorySelect.value = '';
        itemCitySelect.value = '';

        filters = {
            query: '',
            type: '',
            category: '',
            city: ''
        };

        saveFiltersToStorage();
        currentPage = 0;
        loadItems();
    }

    // Load categories
    async function loadCategories() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token found, skipping categories load');
            return;
        }

        try {
            const response = await fetch('/api/items/categories', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const categories = await response.json();
            if (itemCategorySelect) {
                populateSelect(itemCategorySelect, categories, 'All Categories', filters.category);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    // Load cities
    async function loadCities() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token found, skipping cities load');
            return;
        }

        try {
            const response = await fetch('/api/items/cities', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const cities = await response.json();
            if (itemCitySelect) {
                populateSelect(itemCitySelect, cities, 'All Cities', filters.city);
            }
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    }

    // Populate select dropdown
    function populateSelect(selectElement, items, defaultText, selectedValue) {
        selectElement.innerHTML = `<option value="">${defaultText}</option>`;

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            if (item === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    // Save filters to localStorage
    function saveFiltersToStorage() {
        localStorage.setItem('itemFilters', JSON.stringify(filters));
    }

    // Load filters from localStorage
    function loadFiltersFromStorage() {
        const savedFilters = localStorage.getItem('itemFilters');
        if (savedFilters) {
            try {
                filters = JSON.parse(savedFilters);
                if (searchInput) searchInput.value = filters.query || '';
                if (itemTypeSelect) itemTypeSelect.value = filters.type || '';
                if (itemCategorySelect) itemCategorySelect.value = filters.category || '';
                if (itemCitySelect) itemCitySelect.value = filters.city || '';
            } catch (e) {
                console.error('Error parsing saved filters:', e);
                localStorage.removeItem('itemFilters');
            }
        }
    }

    // Get badge class based on item type
    function getBadgeClass(type) {
        switch (type) {
            case 'SWAP': return 'badge-swap';
            case 'SELL': return 'badge-sell';
            case 'DONATE': return 'badge-donate';
            default: return 'badge-secondary';
        }
    }

    // Format item type for display
    function formatItemType(type) {
        if (!type) return '';
        const typeMap = {
            'SELL': 'SELL',
            'SWAP': 'SWAP',
            'DONATE': 'DONATE'
        };
        return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }

    // Show toast for unavailable items
    function showUnavailableToast() {
        const toast = document.getElementById('toast');
        const toastBody = document.getElementById('toast-body');

        if (toast && toastBody) {
            toastBody.textContent = 'This item is currently unavailable';
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }

    // Show item details in modal
    function showItemDetails(item) {
        console.log('Viewing item:', item);

        // Check if item is disabled
        const isDisabled = item.active === 'false' || item.active === false || item.active === 'f';
        if (isDisabled) {
            showUnavailableToast();
            return;
        }

        // Debug: Log all available properties of the item
        console.log('Item properties:', Object.keys(item));
        if (item.seller) {
            console.log('Seller properties:', Object.keys(item.seller));
        }

        // Set the modal title and content
        document.getElementById('itemDetailTitle').textContent = item.title || 'No Title';
        document.getElementById('itemDetailDescription').textContent = item.description || 'No description available';
        document.getElementById('itemDetailCategory').textContent = item.category || 'No category';
        document.getElementById('itemDetailCity').textContent = item.city || 'Location not specified';

        // Set condition with fallback to 'Not specified' if not available
        const conditionElement = document.getElementById('itemDetailCondition');
        const condition = item.condition || item.itemCondition || 'Not specified';
        conditionElement.textContent = condition;

        // Format the condition text with appropriate styling
        conditionElement.className = '';

        if (condition && condition.trim() !== '') {
            const lowerCondition = condition.toLowerCase().trim();

            if (lowerCondition.includes('new') || lowerCondition === 'as new') {
                conditionElement.classList.add('text-success');
            } else if (lowerCondition.includes('good') || lowerCondition.includes('excellent')) {
                conditionElement.classList.add('text-primary');
            } else if (lowerCondition.includes('fair') || lowerCondition.includes('used')) {
                conditionElement.classList.add('text-warning');
            } else if (lowerCondition.includes('poor') || lowerCondition.includes('bad')) {
                conditionElement.classList.add('text-danger');
            } else {
                conditionElement.classList.add('text-muted');
            }
        } else {
            conditionElement.textContent = 'Condition not specified';
            conditionElement.className = 'text-muted';
        }

        // Set seller information
        const sellerElement = document.getElementById('itemDetailSeller');
        const sellerEmailElement = document.getElementById('itemDetailSellerEmail');
        const sellerInfo = item.seller || {};

        sellerElement.textContent = sellerInfo.name || sellerInfo.username || 'Anonymous';
        sellerEmailElement.textContent = sellerInfo.email || '';

        // Format and set the post date
        const postDate = item.postDate || item.createdAt || new Date().toISOString();
        document.getElementById('itemDetailPostDate').textContent = `Posted on ${new Date(postDate).toLocaleDateString()}`;

        // Placeholder SVG (same as your current one)
        const placeholderSVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjY1JSIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjMwMHgxNTA8L3RleHQ+PC9zdmc+';

        // Function to safely validate and return an image source or placeholder
        const safeImageSrc = (src) => {
            if (src && (src.startsWith('http') || src.startsWith('data:image') || src.startsWith('/'))) {
                return src;
            }
            return placeholderSVG;
        };

        // Populate carousel images
        const carouselInner = document.getElementById('itemImagesCarouselInner');
        carouselInner.innerHTML = ''; // Clear previous images

        try {
            let images = [];

            // Collect available images in priority order
            if (item.imageUrls && item.imageUrls.length > 0) {
                images = item.imageUrls;
            } else if (item.images && item.images.length > 0) {
                images = item.images;
            } else if (item.imageUrl) {
                images = [item.imageUrl];
            } else if (item.image) {
                images = [item.image];
            }

            // Populate the carousel
            if (images.length > 0) {
                images.forEach((src, index) => {
                    const imgSrc = safeImageSrc(src);
                    const div = document.createElement('div');
                    div.classList.add('carousel-item');
                    if (index === 0) div.classList.add('active');
                    div.innerHTML = `<img src="${imgSrc}" class="d-block w-100 rounded" style="max-height:400px;object-fit:contain;">`;
                    carouselInner.appendChild(div);
                });
            } else {
                // No images — show placeholder
                carouselInner.innerHTML = `
                    <div class="carousel-item active">
                        <img src="${placeholderSVG}" class="d-block w-100 rounded" style="max-height:400px;object-fit:contain;">
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error setting carousel images:', error);
            carouselInner.innerHTML = `
                <div class="carousel-item active">
                    <img src="${placeholderSVG}" class="d-block w-100 rounded" style="max-height:400px;object-fit:contain;">
                </div>
            `;
        }

        // Set the badge
        const badgeElement = document.getElementById('itemDetailBadge');
        badgeElement.className = 'badge ' + getBadgeClass(item.type);
        badgeElement.textContent = formatItemType(item.type);

        // Set the price or swap info
        const priceElement = document.getElementById('itemDetailPrice');
        if (priceElement) {
            if (item.type === 'SELL' || item.type === 'sale') {
                const price = item.price || 0;
                priceElement.textContent = `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                priceElement.classList.add('fw-bold', 'text-success');
            } else if (item.type === 'SWAP' || item.type === 'swap') {
                priceElement.textContent = 'For Swap';
                priceElement.classList.add('fw-bold', 'text-primary');
            } else if (item.type === 'DONATE' || item.type === 'donation') {
                priceElement.textContent = 'Free';
                priceElement.classList.add('fw-bold', 'text-success');
            } else {
                priceElement.textContent = 'Price not available';
                priceElement.classList.add('text-muted');
            }
        }


        // Debug: Log the item object to see what fields are available
        console.log('Item details:', item);

        // Format the condition text with appropriate styling
        conditionElement.className = '';

        if (condition && condition.trim() !== '') {
            const lowerCondition = condition.toLowerCase().trim();

            if (lowerCondition.includes('new') || lowerCondition === 'as new') {
                conditionElement.classList.add('text-success');
            } else if (lowerCondition.includes('good') || lowerCondition.includes('excellent')) {
                conditionElement.classList.add('text-primary');
            } else if (lowerCondition.includes('fair') || lowerCondition.includes('used')) {
                conditionElement.classList.add('text-warning');
            } else if (lowerCondition.includes('poor') || lowerCondition.includes('bad')) {
                conditionElement.classList.add('text-danger');
            } else {
                conditionElement.classList.add('text-muted');
            }
        } else {
            conditionElement.textContent = 'Condition not specified';
            conditionElement.className = 'text-muted';
        }

        if (!sellerElement || !sellerEmailElement) {
            console.error('Required seller elements not found in the DOM');
            return;
        }

        // Log the item object to see what seller data is available
        console.log('Item data for seller info:', item);

        // Get seller information from the item
        const seller = item.seller || {};

        // Set seller name with fallback
        const sellerName = seller.name || 'Seller';
        sellerElement.textContent = sellerName;

        // Set seller email if available
        if (seller.email) {
            sellerEmailElement.innerHTML = `<i class="fas fa-envelope me-1"></i>${seller.email}`;
            sellerEmailElement.style.display = 'block';
        } else {
            sellerEmailElement.style.display = 'none';
        }

        // Set post date - check multiple possible date fields
        const postDateElement = document.getElementById('itemDetailPostDate');
        const possibleDateFields = ['createdAt', 'postDate', 'datePosted', 'createdDate', 'date'];
        let itemPostDate = null;

        for (const field of possibleDateFields) {
            if (item[field]) {
                itemPostDate = new Date(item[field]);
                if (!isNaN(itemPostDate.getTime())) {
                    break;
                }
            }
        }

        if (itemPostDate && !isNaN(itemPostDate.getTime())) {
            postDateElement.textContent = `Posted on ${itemPostDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } else {
            postDateElement.textContent = '';
        }

        // Set up action buttons
        const actionButtons = document.getElementById('itemActionButtons');
        actionButtons.innerHTML = '';

        // Get current user ID from localStorage
        const currentUserId = localStorage.getItem('userId');
        const sellerId = item.seller?.id || item.sellerId;
        const isOwner = currentUserId && currentUserId === sellerId;

        if (isOwner) {
            alert('You cannot message yourself');
            return;
        }

        // Update the message seller button in the modal
        const messageSellerBtn = document.getElementById('messageSellerBtn');
        if (messageSellerBtn) {
            messageSellerBtn.setAttribute('data-seller-id', sellerId || '');
            messageSellerBtn.setAttribute('data-seller-username', item.seller?.name || item.sellerName || '');
            messageSellerBtn.setAttribute('data-item-id', item.id || '');
            messageSellerBtn.style.display = isOwner ? 'none' : 'inline-block';
        }

        if (!isOwner) {
            // Show message button in the details view
            const messageBtn = document.createElement('button');
            messageBtn.className = 'btn btn-outline-primary';
            messageBtn.innerHTML = '<i class="fas fa-comment-dots me-1"></i> Message Seller';
            messageBtn.onclick = () => startChatWithSeller({
                id: item.id,
                sellerId: sellerId,
                seller: {
                    id: sellerId,
                    name: item.seller?.name || item.sellerName
                }
            });
            actionButtons.appendChild(messageBtn);

            // Show action buttons based on item type
            if (item.type === 'SELL') {
                const buyBtn = document.createElement('button');
                buyBtn.className = 'btn btn-primary ms-2';
                buyBtn.innerHTML = '<i class="fas fa-shopping-cart me-1"></i> Buy Now';
                buyBtn.onclick = () => initiatePurchase(item);
                actionButtons.appendChild(buyBtn);
            } else if (item.type === 'SWAP') {
                const swapBtn = document.createElement('button');
                swapBtn.className = 'btn btn-primary ms-2';
                swapBtn.innerHTML = '<i class="fas fa-exchange-alt me-1"></i> Swap';
                swapBtn.onclick = () => initiateSwap(item);
                actionButtons.appendChild(swapBtn);
            } else if (item.type === 'DONATE') {
                const donateBtn = document.createElement('button');
                donateBtn.className = 'btn btn-primary ms-2';
                donateBtn.innerHTML = '<i class="fas fa-gift me-1"></i> Request';
                donateBtn.onclick = () => initiateDonation(item);
                actionButtons.appendChild(donateBtn);
            }
        }

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('itemDetailsModal'));
        modal.show();
    }

    // Contact seller function
    function contactSeller(item) {
        // Here you would implement the contact seller functionality
        console.log('Contacting seller for item:', item.id);
        showToast(`Contacting seller about ${item.title}`);
        // In a real app, this would open a chat or email dialog
    }

    // Initiate purchase function
    function initiatePurchase(item) {
        console.log('Initiating purchase for item:', item.id);
        showToast(`Initiating purchase for ${item.title}`);
        // In a real app, this would redirect to checkout or open a payment modal
    }

    // Initiate swap function
    function initiateSwap(item) {
        console.log('Initiating swap for item:', item.id);
        showToast(`Initiating swap request for ${item.title}`);
        // In a real app, this would open a swap request form
    }

    // Show donation request modal
    function  DonationRequestModal(item) {
        // Remove existing modal if any
        const existingModal = document.getElementById('donationRequestModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHtml = `
        <div class="modal fade" id="donationRequestModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Request Donation</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <h6>${item.title}</h6>
                            <p class="text-muted small">${item.description || 'No description available'}</p>
                        </div>
                        <form id="donationRequestForm">
                            <div class="mb-3">
                                <label for="reason" class="form-label">Why do you need this item?</label>
                                <textarea class="form-control" id="reason" rows="3" required
                                    placeholder="Please explain how you'll use this item..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="deliveryAddress" class="form-label">Delivery Address</label>
                                <textarea class="form-control" id="deliveryAddress" rows="2" required
                                    placeholder="Enter your complete delivery address"></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="contactNumber" class="form-label">Contact Number</label>
                                <input type="tel" class="form-control" id="contactNumber" required
                                    placeholder="Your contact number">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitDonationRequest">
                            <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                            <span class="btn-text">Submit Request</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize modal
        const modal = new bootstrap.Modal(document.getElementById('donationRequestModal'));

        // Handle form submission
        document.getElementById('submitDonationRequest').addEventListener('click', async () => {
            await submitDonationRequest(item.id, modal);
        });

        // Show the modal
        modal.show();
    }

    // Handle donation request submission
    async function submitDonationRequest(itemId, modal) {
        const submitBtn = document.getElementById('submitDonationRequest');
        const spinner = submitBtn.querySelector('.spinner-border');
        const btnText = submitBtn.querySelector('.btn-text');

        try {
            // Show loading state
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            btnText.textContent = 'Submitting...';

            const requestData = {
                itemId: itemId,
                reason: document.getElementById('reason').value,
                deliveryAddress: document.getElementById('deliveryAddress').value,
                contactNumber: document.getElementById('contactNumber').value
            };

            // Call API to submit donation request
            const response = await fetch('/api/actions/donation-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to submit request');
            }

            // Show success message
            showToast('Donation request submitted successfully! The owner will contact you soon.', 'success');

            // Close modal after delay
            setTimeout(() => {
                modal.hide();
                // Remove modal from DOM after it's hidden
                const modalElement = document.getElementById('donationRequestModal');
                if (modalElement) {
                    modalElement.remove();
                }
            }, 1500);

        } catch (error) {
            console.error('Error submitting donation request:', error);
            showToast(error.message || 'Failed to submit request. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            btnText.textContent = 'Submit Request';
        }
    }

    // Initiate donation function
    function initiateDonation(item) {
        console.log('Initiating donation for item:', item);
        showDonationRequestModal(item);
    }

    // Handle unauthorized access
    function handleUnauthorized() {
        localStorage.removeItem('token');
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?sessionExpired=true&returnUrl=${returnUrl}`;
    }

    // Start chat with seller
    function startChatWithSeller(item) {
        try {
            console.log('Starting chat with seller for item:', item);

            // Check if user is authenticated
            const token = localStorage.getItem('token');
            if (!token) {
                // Redirect to login with return URL
                const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login?returnUrl=${returnUrl}`;
                return;
            }

            // Get current user info
            const currentUserId = localStorage.getItem('userId');
            if (!currentUserId) {
                throw new Error('User not authenticated');
            }

            // Log the item structure to debug
            console.log('Item object:', JSON.stringify(item, null, 2));

            // Get seller ID from different possible locations in the item object
            const sellerId = item.seller?.id || item.sellerId || (item.seller && item.seller.userId);

            if (!sellerId) {
                console.error('Seller ID not found in item:', item);
                showError('Could not determine seller information. Please try again later.');
                return;
            }

            // Check if we're not the seller
            if (currentUserId == sellerId) {  // Using loose equality to handle string/number mismatches
                showError('You cannot message yourself');
                return;
            }

            // Show loading state
            const messageBtn = document.querySelector('.btn-outline-primary');
            if (messageBtn) {
                const originalText = messageBtn.innerHTML;
                messageBtn.disabled = true;
                messageBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Loading...';

                // Revert button state after 3 seconds if something goes wrong
                const revertButton = setTimeout(() => {
                    messageBtn.disabled = false;
                    messageBtn.innerHTML = originalText;
                }, 3000);

                const participantId = Number(sellerId);
                const numericItemId = item.id ? Number(item.id) : null;

                // First, check for existing conversations with this seller
                fetch(`/api/chat/rooms`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(response => response.ok ? response.json() : Promise.reject('Failed to load conversations'))
                .then(conversations => {
                    // Try to find an existing conversation with this seller
                    const existingChat = conversations.find(conv =>
                        conv.participants && conv.participants.some(p => p.id === participantId)
                    );

                    if (existingChat) {
                        console.log('Found existing conversation:', existingChat);
                        // If we have an existing chat, use it regardless of the item
                        return Promise.resolve(existingChat);
                    }

                    // If no existing chat, create a new one
                    const url = new URL('/api/chat/rooms', window.location.origin);
                    url.searchParams.append('participantId', participantId);
                    if (numericItemId) {
                        url.searchParams.append('itemId', numericItemId);
                    }

                    console.log('Creating new chat room with:', { participantId, itemId: numericItemId });

                    return fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            participantId: participantId,
                            itemId: numericItemId
                        })
                    })
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(text => {
                                throw new Error(`Failed to create chat: ${response.status} ${text}`);
                            });
                        }
                        return response.json();
                    });
                })
                .then(chat => {
                    clearTimeout(revertButton);
                    console.log('Chat started successfully:', chat);

                    // Close any open modals
                    const modals = document.querySelectorAll('.modal');
                    modals.forEach(modal => {
                        const modalInstance = bootstrap.Modal.getInstance(modal);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    });

                    // Ensure we have a valid chat room ID before redirecting
                    const roomId = chat.id || (chat.roomId || (chat.chatRoomId || null));
                    if (!roomId) {
                        throw new Error('No chat room ID received from server');
                    }

                    // Redirect to messages page with the chat room ID
                    window.location.href = `/messages?roomId=${roomId}`;
                })
                .catch(error => {
                    console.error('Error in chat process:', error);
                    showError(error.message || 'Failed to start chat. Please try again.');

                    // Re-enable the button
                    messageBtn.disabled = false;
                    messageBtn.innerHTML = originalText;
                });
            }

        } catch (error) {
            console.error('Error in startChatWithSeller:', error);
            showError('An error occurred. Please try again.');

            // Re-enable the button if it exists
            const messageBtn = document.querySelector('.btn-outline-primary');
            if (messageBtn) {
                messageBtn.disabled = false;
                const originalText = messageBtn.getAttribute('data-original-text');
                if (originalText) {
                    messageBtn.innerHTML = originalText;
                }
            }
        }
    }

    // Initialize chat functionality when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Handle message seller button click
        const messageSellerBtn = document.getElementById('messageSellerBtn');
        if (messageSellerBtn) {
            messageSellerBtn.addEventListener('click', function() {
                const sellerId = this.getAttribute('data-seller-id');
                const itemId = this.getAttribute('data-item-id');
                const sellerName = this.getAttribute('data-seller-username');

                if (!sellerId || !itemId) {
                    showError('Unable to start chat: Missing required information');
                    return;
                }

                startChatWithSeller({
                    sellerId: sellerId,
                    id: itemId,
                    seller: {
                        id: sellerId,
                        name: sellerName
                    }
                });
            });
        }

        // Set up WebSocket connection for chat notifications
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login with return URL
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?returnUrl=${returnUrl}`;
            return;
        }

        // Get current user info
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) {
            throw new Error('User not authenticated');
        }

        // Log the item structure to debug
        console.log('Item object:', JSON.stringify(item, null, 2));

        // Get seller ID from different possible locations in the item object
        const sellerId = item.seller?.id || item.sellerId || (item.seller && item.seller.userId);

        if (!sellerId) {
            console.error('Seller ID not found in item:', item);
            showError('Could not determine seller information. Please try again later.');
            return;
        }

        // Check if we're not the seller
        if (currentUserId == sellerId) {  // Using loose equality to handle string/number mismatches
            showError('You cannot message yourself');
            return;
        }

        // Show loading state
        const messageBtn = document.querySelector('.btn-outline-primary');
        if (messageBtn) {
            const originalText = messageBtn.innerHTML;
            messageBtn.disabled = true;
            messageBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Loading...';

            // Revert button state after 3 seconds if something goes wrong
            const revertButton = setTimeout(() => {
                messageBtn.disabled = false;
                messageBtn.innerHTML = originalText;
            }, 3000);

            // Create or get existing chat room with the seller
            const participantId = Number(sellerId);
            const numericItemId = item.id ? Number(item.id) : null;

            // Build URL with query parameters
            const url = new URL('/api/chat/rooms', window.location.origin);
            url.searchParams.append('participantId', participantId);

            if (numericItemId) {
                url.searchParams.append('itemId', numericItemId);
            }

            console.log('Sending chat request to:', url.toString());

            fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                clearTimeout(revertButton);
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.message || 'Failed to create chat room');
                    });
                }
                return response.json();
            })
            .then(data => {
                // Redirect to chat page
                window.location.href = `/messages.html?chatId=${data.id}`;
            })
            .catch(error => {
                console.error('Error creating chat room:', error);
                showError(error.message || 'Failed to start chat. Please try again.');
            })
            .finally(() => {
                messageBtn.disabled = false;
                messageBtn.innerHTML = originalText;
            });
        }
    });

    // Show notification for new message
    function showNewMessageNotification(notification) {
        const notificationBadge = document.getElementById('chatNotificationBadge');
        if (notificationBadge) {
            notificationBadge.style.display = 'flex';
            notificationBadge.textContent = notification.unreadCount || '1';
        }

        // Show toast notification
        showToast(`New message from ${notification.senderName}: ${notification.messagePreview}`);
    }

    // Call this when a message is viewed
    function markMessagesAsRead(chatRoomId) {
        const token = localStorage.getItem('token');
        if (!token || !chatRoomId) return;

        fetch(`/api/messages/chat/${chatRoomId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to mark messages as read');
            }
            updateMessagesBadge(); // Update the badge after marking as read
        })
        .catch(error => console.error('Error marking messages as read:', error));
    }

    // Call this when opening a chat or viewing messages
    function openChat(chatRoomId) {
        // Your existing code to open the chat...

        // Mark messages as read when opening the chat
        markMessagesAsRead(chatRoomId);
    }

    // Make functions available globally
    window.changePage = changePage;
    window.showItemDetails = showItemDetails;
    window.applyFilters = applyFilters;
    window.resetFilters = resetFilters;
    window.startChatWithSeller = startChatWithSeller;

    // Initialize the page when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Load initial data
        loadCategories();
        loadCities();
        loadItems();
        loadUnreadCount();

        // Set up event listeners
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                applyFilters();
            });
        }

        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetFilters);
        }

        // Load saved filters if any
        loadFiltersFromStorage();
    });

    // Load unread notification count
    async function loadUnreadCount() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/api/notifications/unread/count', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                updateNotificationBadges(data.count || 0);
            }
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    }

    // Update notification badges in the UI
    function updateNotificationBadges(count) {
        // Update the main notification badge in the header
        const notificationBadges = document.querySelectorAll('.notification-badge');
        notificationBadges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });

        // Update the messages count in the sidebar
        const messageBadges = document.querySelectorAll('.message-badge');
        messageBadges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
    }

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

    // Call this periodically to update the badge
    setInterval(updateMessagesBadge, 30000); // Update every 30 seconds

    //====================== TRANSACTION REQUEST START ======================//

    // Show Buy Modal
    function showBuyModal(item) {
        const modalHtml = `
            <div class="modal fade" id="buyModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Buy Item</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <h6>${item.title}</h6>
                                <p class="text-muted small">Price: ${item.price ? '₹' + Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Negotiable'}</p>
                            </div>
                            <form id="buyForm" class="needs-validation" novalidate>
                                <div class="mb-3">
                                    <label for="buyerMessage" class="form-label">Message to Seller</label>
                                    <textarea class="form-control" id="buyerMessage" rows="3"
                                        placeholder="Add a message for the seller (optional)" maxlength="500"></textarea>
                                    <div class="form-text text-end"><span id="messageCounter">0</span>/500</div>
                                </div>
                                <div class="mb-3">
                                    <label for="deliveryAddress" class="form-label">Delivery Address <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="deliveryAddress" rows="2" required
                                        placeholder="Enter your complete delivery address" minlength="10" maxlength="200"></textarea>
                                    <div class="invalid-feedback">
                                        Please provide a valid delivery address (10-200 characters).
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="contactNumber" class="form-label">Contact Number <span class="text-danger">*</span></label>
                                    <input type="tel" class="form-control" id="contactNumber" required
                                        placeholder="Your contact number"
                                        pattern="[0-9]{10,15}"
                                        title="Please enter a valid phone number (10-15 digits)">
                                    <div class="invalid-feedback">
                                        Please provide a valid phone number (10-15 digits).
                                    </div>
                                </div>
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="termsCheck" required>
                                    <label class="form-check-label" for="termsCheck">
                                        I agree to the <a href="/terms" target="_blank">terms and conditions</a>
                                    </label>
                                    <div class="invalid-feedback">
                                        You must agree to the terms and conditions.
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="submitBuyRequest">
                                <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                <span class="btn-text">Send Buy Request</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Remove existing modal if any
        const existingModal = document.getElementById('buyModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize modal
        const modal = new bootstrap.Modal(document.getElementById('buyModal'));

        // Handle form submission with validation
        const submitButton = document.getElementById('submitBuyRequest');
        const buyForm = document.getElementById('buyForm');
        const buyerMessage = document.getElementById('buyerMessage');
        const messageCounter = document.getElementById('messageCounter');

        // Character counter for message
        if (buyerMessage && messageCounter) {
            buyerMessage.addEventListener('input', () => {
                messageCounter.textContent = buyerMessage.value.length;
            });
        }

        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();

            // Check form validity
            if (!buyForm.checkValidity()) {
                buyForm.classList.add('was-validated');
                return;
            }

            // Show loading state
            const spinner = submitButton.querySelector('.spinner-border');
            const buttonText = submitButton.querySelector('.btn-text');
            spinner.classList.remove('d-none');
            buttonText.textContent = 'Sending...';
            submitButton.disabled = true;

            try {
                await submitTransactionRequest({
                    itemId: item.id,
                    type: 'BUY',
                    message: buyerMessage.value.trim(),
                    deliveryAddress: document.getElementById('deliveryAddress').value.trim(),
                    contactNumber: document.getElementById('contactNumber').value.trim()
                }, modal);
            } catch (error) {
                console.error('Error submitting buy request:', error);
                showToast('Failed to submit request. Please try again.', 'error');
            } finally {
                spinner.classList.add('d-none');
                buttonText.textContent = 'Send Buy Request';
                submitButton.disabled = false;
            }
        });

        // Show the modal
        modal.show();
    }

    // Show Request Modal
    function showRequestModal(item) {
        const modalHtml = `
            <div class="modal fade" id="requestModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Request Item</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <h6>${item.title}</h6>
                                <p class="text-muted small">Requesting this item from the owner</p>
                            </div>
                            <form id="requestForm" class="needs-validation" novalidate>
                                <div class="mb-3">
                                    <label for="requestReason" class="form-label">Why do you need this item? <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="requestReason" rows="3" required
                                        placeholder="Please explain why you need this item..."
                                        minlength="20" maxlength="500"></textarea>
                                    <div class="form-text">Minimum 20 characters</div>
                                    <div class="invalid-feedback">
                                        Please provide a reason for your request (20-500 characters).
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="deliveryAddress" class="form-label">Delivery Address <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="deliveryAddress" rows="2" required
                                        placeholder="Enter your complete delivery address"
                                        minlength="10" maxlength="200"></textarea>
                                    <div class="invalid-feedback">
                                        Please provide a valid delivery address (10-200 characters).
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="contactNumber" class="form-label">Contact Number <span class="text-danger">*</span></label>
                                    <input type="tel" class="form-control" id="contactNumber" required
                                        placeholder="Your contact number"
                                        pattern="[0-9]{10,15}"
                                        title="Please enter a valid phone number (10-15 digits)">
                                    <div class="invalid-feedback">
                                        Please provide a valid phone number (10-15 digits).
                                    </div>
                                </div>
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="donationTermsCheck" required>
                                    <label class="form-check-label" for="donationTermsCheck">
                                        I understand this is a donation request and I agree to the <a href="/terms" target="_blank">terms and conditions</a>
                                    </label>
                                    <div class="invalid-feedback">
                                        You must agree to the terms and conditions.
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="submitRequest">
                                <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                <span class="btn-text">Send Request</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Remove existing modal if any
        const existingModal = document.getElementById('requestModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize modal
        const modal = new bootstrap.Modal(document.getElementById('requestModal'));

        // Handle form submission with validation
        const submitButton = document.getElementById('submitRequest');
        const requestForm = document.getElementById('requestForm');
        const requestReason = document.getElementById('requestReason');

        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();

            // Check form validity
            if (!requestForm.checkValidity()) {
                requestForm.classList.add('was-validated');
                return;
            }

            // Show loading state
            const spinner = submitButton.querySelector('.spinner-border');
            const buttonText = submitButton.querySelector('.btn-text');
            spinner.classList.remove('d-none');
            buttonText.textContent = 'Sending...';
            submitButton.disabled = true;

            try {
                await submitTransactionRequest({
                    itemId: item.id,
                    type: 'REQUEST',
                    message: requestReason.value.trim(),
                    deliveryAddress: document.getElementById('deliveryAddress').value.trim(),
                    contactNumber: document.getElementById('contactNumber').value.trim()
                }, modal);
            } catch (error) {
                console.error('Error submitting donation request:', error);
                showToast('Failed to submit request. Please try again.', 'error');
            } finally {
                spinner.classList.add('d-none');
                buttonText.textContent = 'Send Request';
                submitButton.disabled = false;
            }
        });

        // Show the modal
        modal.show();
    }

    // Show Swap Modal
    function showSwapModal(item) {
        const modalHtml = `
            <div class="modal fade" id="swapModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Swap Item</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="swapContent">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Preparing swap options...</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Remove any existing modals to prevent duplicates
        const existingModal = document.getElementById('swapModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add the modal to the DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize the modal
        const modalElement = document.getElementById('swapModal');
        const modal = new bootstrap.Modal(modalElement);

        // Load user's items for swap
        loadUserItemsForSwap(item);

        // Show the modal
        modal.show();
    }

    // Show add item prompt
    function showAddItemPrompt() {
        const swapContent = document.getElementById('swapContent');
        if (!swapContent) return;

        swapContent.innerHTML = `
            <div class="text-center py-4">
                <div class="mb-4">
                    <i class="fas fa-exchange-alt fa-4x text-muted mb-3"></i>
                    <h4>No Items to Swap</h4>
                    <p class="text-muted">You don't have any items listed for swapping yet.</p>
                </div>
                <div class="d-grid gap-2">
                    <a href="/add-item.html" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Add New Item
                    </a>
                    <button class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-times me-2"></i>Cancel
                    </button>
                </div>
            </div>`;
    }

    // Show swap form with items
    function showSwapForm(item, items) {
        const swapContent = document.getElementById('swapContent');
        if (!swapContent) return;

        swapContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Item You're Offering</h6>
                    <div id="yourItemsList" class="mb-3">
                        <div class="list-group">
                            ${items.map(item => `
                                <label class="list-group-item d-flex gap-3">
                                    <input class="form-check-input flex-shrink-0" type="radio"
                                           name="swapItem" value="${item.id}" style="margin-top: 0.2rem;">
                                    <div class="d-flex gap-2 w-100">
                                        <img src="${item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PC9zdmc+'}"
                                             alt="${item.title}" width="60" height="60" style="object-fit: cover; border-radius: 4px;">
                                        <div>
                                            <h6 class="mb-0">${item.title}</h6>
                                            <p class="mb-0 small text-muted">${item.description ? item.description.substring(0, 50) + (item.description.length > 50 ? '...' : '') : 'No description'}</p>
                                            <span class="badge ${getBadgeClass(item.type)}">${formatItemType(item.type)}</span>
                                        </div>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                        <div class="mt-2">
                            <a href="/add-item.html" class="btn btn-outline-primary btn-sm w-100">
                                <i class="fas fa-plus me-1"></i>Add Another Item
                            </a>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Item You Want</h6>
                    <div class="card h-100">
                        <img src="${item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPjwvc3ZnPg=='}"
                             class="card-img-top" alt="${item.title}" style="height: 150px; object-fit: cover;">
                        <div class="card-body">
                            <h6 class="card-title">${item.title}</h6>
                            <p class="card-text small text-muted">${item.description ? item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '') : 'No description'}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge ${getBadgeClass(item.type)}">${formatItemType(item.type)}</span>
                                <span class="text-muted small">${item.city || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <form id="swapForm" class="mt-4 needs-validation" novalidate>
                <div class="mb-3">
                    <label for="swapMessage" class="form-label">Message to the Owner</label>
                    <textarea class="form-control" id="swapMessage" rows="3"
                        placeholder="Add a message for the owner (optional)" maxlength="500"></textarea>
                    <div class="form-text text-end"><span id="swapMessageCounter">0</span>/500</div>
                </div>
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="swapTermsCheck" required>
                    <label class="form-check-label" for="swapTermsCheck">
                        I agree to the <a href="/terms" target="_blank">terms and conditions</a> for item swapping
                    </label>
                    <div class="invalid-feedback">
                        You must agree to the terms and conditions.
                    </div>
                </div>
                <div class="d-grid gap-2">
                    <button type="button" class="btn btn-primary" id="submitSwapRequest">
                        <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                        <span class="btn-text">Send Swap Request</span>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        Cancel
                    </button>
                </div>
            </form>`;

        // Initialize form interactions
        const swapMessage = document.getElementById('swapMessage');
        const swapMessageCounter = document.getElementById('swapMessageCounter');
        const submitButton = document.getElementById('submitSwapRequest');
        const swapForm = document.getElementById('swapForm');

        // Character counter for message
        if (swapMessage && swapMessageCounter) {
            swapMessage.addEventListener('input', () => {
                swapMessageCounter.textContent = swapMessage.value.length;
            });
        }

        // Enable/disable submit button based on selection
        const radioButtons = document.querySelectorAll('input[name="swapItem"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            });
        });

        // Handle form submission
        if (submitButton && swapForm) {
            submitButton.addEventListener('click', async (e) => {
                e.preventDefault();

                if (!swapForm.checkValidity()) {
                    swapForm.classList.add('was-validated');
                    return;
                }

                const selectedItem = document.querySelector('input[name="swapItem"]:checked');
                if (!selectedItem) {
                    showToast('Please select an item to swap', 'error');
                    return;
                }

                // Show loading state
                const spinner = submitButton.querySelector('.spinner-border');
                const buttonText = submitButton.querySelector('.btn-text');
                spinner.classList.remove('d-none');
                buttonText.textContent = 'Sending...';
                submitButton.disabled = true;

                try {
                    await submitTransactionRequest({
                        itemId: item.id,
                        type: 'SWAP',
                        message: swapMessage ? swapMessage.value.trim() : '',
                        swapItemId: selectedItem.value
                    }, bootstrap.Modal.getInstance(document.getElementById('swapModal')));
                } catch (error) {
                    console.error('Error submitting swap request:', error);
                    showToast('Failed to submit swap request. Please try again.', 'error');
                    if (submitButton) {
                        submitButton.disabled = false;
                        spinner.classList.add('d-none');
                        buttonText.textContent = 'Send Swap Request';
                    }
                }
            });
        }
    }

    // Load user's items for swap selection
    async function loadUserItemsForSwap(targetItem) {
        const swapContent = document.getElementById('swapContent');
        if (!swapContent) {
            console.error('Swap content container not found');
            return;
        }

        // Show loading state
        swapContent.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading your items...</p>
            </div>`;

        const token = localStorage.getItem('token');
        if (!token) {
            swapContent.innerHTML = `
                <div class="text-center py-4">
                    <div class="mb-4">
                        <i class="fas fa-sign-in-alt fa-4x text-warning mb-3"></i>
                        <h4>Login Required</h4>
                        <p class="text-muted">Please log in to view your items for swap.</p>
                    </div>
                    <div class="d-grid gap-2">
                        <a href="/login.html" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt me-2"></i>Login
                        </a>
                        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Cancel
                        </button>
                    </div>
                </div>`;
            return;
        }

        try {
            const response = await fetch('/api/items/my-items', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to load your items');
            }

            const data = await response.json();
            console.log('API Response:', data);

            // Handle different response formats
            let items = [];
            if (Array.isArray(data)) {
                items = data;
            } else if (data && data.items && Array.isArray(data.items)) {
                items = data.items;
            } else if (data && data.data && Array.isArray(data.data)) {
                items = data.data;
            } else if (data && data.content && Array.isArray(data.content)) {
                items = data.content;
            } else if (data && Array.isArray(data)) {
                items = data;
            } else {
                console.error('Unexpected API response format:', data);
                throw new Error('Unexpected response format from server');
            }

            console.log('Extracted items:', items);

            // Filter out the current item if it's in the list
            const filteredItems = items.filter(item => item && item.id && item.id !== targetItem.id);
            console.log('Filtered items:', filteredItems);

            if (filteredItems.length === 0) {
                showAddItemPrompt();
            } else {
                showSwapForm(targetItem, filteredItems);
            }
        } catch (error) {
            console.error('Error loading user items:', error);
            swapContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${error.message || 'Failed to load your items. Please try again later.'}
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-primary" onclick="loadUserItemsForSwap(${JSON.stringify(targetItem).replace(/"/g, '&quot;')})">
                        <i class="fas fa-sync-alt me-2"></i>Try Again
                    </button>
                </div>`;
        }
    }

    // Handle transaction submission
    async function submitTransactionRequest(transactionData, modal) {
        const submitBtn = document.querySelector(`#${modal._element.id} .btn-primary`);
        const spinner = submitBtn.querySelector('.spinner-border');
        const btnText = submitBtn.querySelector('.btn-text');

        try {
            // Show loading state
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            btnText.textContent = 'Sending...';

            if (!transactionData.type) {
                throw new Error('Transaction type is required');
            }

            // Submit the transaction
            await TransactionService.createTransaction(transactionData);

            // Show success message
            showToast('Your request has been sent successfully!', 'success');

            // Close modal after delay
            setTimeout(() => {
                modal.hide();
                modal._element.remove();
            }, 1500);

        } catch (error) {
            console.error('Transaction error:', error);
            showToast(error.message || 'Failed to send request. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            btnText.textContent = 'Send Request';
        }
    }

    // Update the initiatePurchase and initiateDonation functions
    function initiatePurchase(item) {
        const transactionData = {
            itemId: item.id,
            type: 'BUY'
        };
        console.log('Initiating purchase for item:', item);
        showBuyModal(item);
    }

    function initiateDonation(item) {
        const transactionData = {
            itemId: item.id,
            type: 'REQUEST'
        };
        console.log('Initiating donation request for item:', item);
        showRequestModal(item);
    }

    function initiateSwap(item) {
        const transactionData = {
            itemId: item.id,
            type: 'SWAP'
        };
        console.log('Initiating swap request for item:', item);
        showSwapModal(item);
    }

    // Add this to your existing showItemDetails function where you handle action buttons
    function updateActionButtons(item, currentUserId) {
        const isOwner = item.userId === currentUserId;

        // Update buy button
        const buyBtn = document.getElementById('buyBtn');
        if (buyBtn) {
            buyBtn.disabled = isOwner;
            buyBtn.title = isOwner ? 'Cannot buy your own item' : 'Buy this item';
            if (!isOwner) {
                buyBtn.addEventListener('click', () => initiatePurchase(item));
            }
        }

        // Update request button
        const requestBtn = document.getElementById('requestBtn');
        if (requestBtn) {
            requestBtn.disabled = isOwner;
            requestBtn.title = isOwner ? 'Cannot request your own item' : 'Request this item';
            if (!isOwner) {
                requestBtn.addEventListener('click', () => initiateDonation(item));
            }
        }

        // Update swap button
        const swapBtn = document.getElementById('swapBtn');
        if (swapBtn) {
            swapBtn.disabled = isOwner;
            swapBtn.title = isOwner ? 'Cannot swap with your own item' : 'Offer a swap';
            if (!isOwner) {
                swapBtn.addEventListener('click', () => showSwapModal(item));
            }
        }
    }

    //====================== TRANSACTION REQUEST END ======================//

    document.addEventListener('DOMContentLoaded', function() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });

    //====================== SWAP FUNCTIONALITY ======================//

    function renderItemSelection(items) {
        if (!items || items.length === 0) {
            return `
                <div class="text-center p-4">
                    <p class="text-muted">You don't have any items available for swap.</p>
                    <a href="/add-item" class="btn btn-sm btn-outline-primary">Add New Item</a>
                </div>`;
        }

        return `
            <div class="swap-items-list" style="max-height: 300px; overflow-y: auto;">
                ${items.map(item => `
                    <div class="card mb-2">
                        <div class="card-body p-2">
                            <div class="form-check">
                                <input class="form-check-input swap-item-radio"
                                       type="radio"
                                       name="swapItem"
                                       id="swapItem${item.id}"
                                       value="${item.id}">
                                <label class="form-check-label w-100" for="swapItem${item.id}">
                                    <div class="d-flex align-items-center">
                                        <img src="${item.imageUrl || '/img/placeholder.png'}"
                                             class="me-2"
                                             style="width: 50px; height: 50px; object-fit: cover;"
                                             alt="${item.title}">
                                        <div>
                                            <h6 class="mb-0">${item.title}</h6>
                                            <small class="text-muted">${item.category || 'No category'}</small>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }

    async function fetchUserItemsForSwap(excludeItemId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/items/my-items', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user items');
            }

            let items = await response.json();
            // Filter out the item being viewed and any items already in transactions
            return items.filter(item =>
                item.id !== excludeItemId &&
                item.status === 'AVAILABLE' // Only show available items
            );
        } catch (error) {
            console.error('Error fetching user items:', error);
            throw error;
        }
    }

    async function submitSwapRequest(swapData, modal) {
        const submitBtn = document.getElementById('submitSwapRequest');
        const spinner = submitBtn.querySelector('.spinner-border');
        const btnText = submitBtn.querySelector('.btn-text');

        try {
            // Show loading state
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            btnText.textContent = 'Sending...';

            // Submit the swap request
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...swapData,
                    type: 'SWAP'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send swap request');
            }

            // Show success message
            showToast('Swap request sent successfully!', 'success');

            // Close modal after delay
            setTimeout(() => {
                modal.hide();
                modal._element.remove();
            }, 1500);

        } catch (error) {
            console.error('Error submitting swap request:', error);
            showToast(error.message || 'Failed to send swap request. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            btnText.textContent = 'Send Swap Request';
        }
    }

    // Add this to your existing showItemDetails function where you handle action buttons
    function updateActionButtons(item, currentUserId) {
        const swapBtn = document.getElementById('swapBtn');
        
        if (swapBtn) {
            // Remove any existing click event listeners to prevent duplicates
            const newSwapBtn = swapBtn.cloneNode(true);
            swapBtn.parentNode.replaceChild(newSwapBtn, swapBtn);
            
            const isOwner = item.userId === currentUserId;
            newSwapBtn.disabled = isOwner;
            newSwapBtn.title = isOwner ? 'Cannot swap with your own item' : 'Offer a swap';
            
            if (!isOwner) {
                newSwapBtn.addEventListener('click', function(event) {
                    event.preventDefault();
                    console.log('Swap button clicked for item:', item);
                    showSwapModal(item);
                });
            }
        }
    }

    //====================== SWAP FUNCTIONALITY AND MODAL - END ======================//
