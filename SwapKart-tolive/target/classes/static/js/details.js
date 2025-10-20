// Fetch item data and seller's rating
document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("id");

    if (!itemId) {
        alert("Item ID not found in URL.");
        return;
    }

    // Fetch item details
    fetch(`/api/items/${itemId}`)
        .then(res => res.json())
        .then(item => {
            // Update item details
            document.getElementById("itemImage").src = `/images/${item.imagePath || 'default.png'}`;
            document.getElementById("itemName").textContent = item.name;
            document.getElementById("itemType").textContent = item.type;
            document.getElementById("itemCategory").textContent = item.category;
            document.getElementById("itemCity").textContent = item.city;
            const postedByElement = document.getElementById("postedBy");
            postedByElement.textContent = item.postedBy || "Anonymous";
            document.getElementById("itemDescription").textContent = item.description || "No description.";
            
            // Store seller ID for rating
            if (item.sellerId) {
                document.body.setAttribute('data-seller-id', item.sellerId);
                // Fetch seller's rating
                fetchSellerRating(item.sellerId);
            }
            
            // Initialize rating stars
            initializeRatingStars();
        })
        .catch(err => {
            console.error("Error loading item details:", err);
            alert("Failed to load item details.");
        });

    // Initialize rating modal if it exists
    const ratingModal = document.getElementById('ratingModal');
    if (ratingModal) {
        initializeRatingModal();
    }
});

// Fetch seller's average rating
function fetchSellerRating(sellerId) {
    // Use compatibility endpoint added on the server: /api/ratings/seller/{id}/summary
    fetch(`/api/ratings/seller/${sellerId}/summary`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    // No ratings yet
                    updateRatingUI(0, 0);
                    return null;
                }
                throw new Error('Failed to fetch seller rating summary');
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                // summary returns { averageRating, ratingCount }
                const avg = data.averageRating != null ? data.averageRating : 0;
                const count = data.ratingCount != null ? data.ratingCount : 0;
                updateRatingUI(avg, count);
            }
        })
        .catch(error => {
            console.error('Error fetching seller rating summary:', error);
            // Show default state on error
            updateRatingUI(0, 0);
        });

    // Also fetch recent reviews (limit to 5)
    fetch(`/api/ratings/seller/${sellerId}/reviews?size=5`)
        .then(res => res.ok ? res.json() : [])
        .then(reviews => {
            const sellerReviewsListEl = document.getElementById('sellerReviewsList');
            if (!sellerReviewsListEl) return;
            if (!reviews || reviews.length === 0) {
                sellerReviewsListEl.innerHTML = '<div class="text-muted small">No reviews yet.</div>';
                return;
            }
            // Build reviews HTML similar to items.js
            function escapeHtml(str) {
                if (str == null) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }
            function renderStarsInlineHtml(rating) {
                const max = 5;
                const r = Number(rating) || 0;
                let out = '';
                for (let i = 1; i <= max; i++) {
                    if (r >= i) out += '<i class="fas fa-star text-warning"></i>';
                    else if (r >= i - 0.5) out += '<i class="fas fa-star-half-alt text-warning"></i>';
                    else out += '<i class="far fa-star text-warning"></i>';
                }
                return out;
            }

            sellerReviewsListEl.innerHTML = reviews.map(r => {
                const reviewer = r.reviewerName || r.userName || r.name || (r.rater && r.rater.name) || 'User';
                const rating = r.score || r.rating || r.stars || 0;
                const comment = r.comment || r.text || r.message || '';
                const date = r.createdAt || r.date || r.postedAt || r.timestamp || '';
                const dateStr = date ? new Date(date).toLocaleDateString() : '';
                return `
                    <div class="border rounded p-2 mb-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="fw-bold small">${escapeHtml(reviewer)}</div>
                            <div class="small text-warning">${renderStarsInlineHtml(rating)}</div>
                        </div>
                        <div class="small text-muted">${escapeHtml(comment)}</div>
                        <div class="small text-muted mt-1">${dateStr}</div>
                    </div>`;
            }).join('');
        })
        .catch(err => console.error('Error fetching seller reviews:', err));
}

// Update the rating UI with the average rating
function updateRatingUI(averageRating, totalRatings) {
    // Use the element IDs used in items.html
    const averageRatingElement = document.getElementById('sellerAverageRating');
    const ratingCountElement = document.getElementById('sellerReviewCount');
    const starContainer = document.getElementById('sellerStars');

    const avg = averageRating != null ? Number(averageRating) : 0;
    const count = totalRatings != null ? Number(totalRatings) : 0;

    if (averageRatingElement) {
        averageRatingElement.textContent = isNaN(avg) ? '-' : avg.toFixed(1);
    }
    if (ratingCountElement) {
        ratingCountElement.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
    }

    // Render stars into sellerStars container
    if (starContainer) {
        starContainer.innerHTML = '';
        const max = 5;
        for (let i = 1; i <= max; i++) {
            const iEl = document.createElement('i');
            if (avg >= i) iEl.className = 'fas fa-star text-warning me-1';
            else if (avg >= i - 0.5) iEl.className = 'fas fa-star-half-alt text-warning me-1';
            else iEl.className = 'far fa-star text-warning me-1';
            starContainer.appendChild(iEl);
        }
    }
}

// Initialize rating stars hover effect
function initializeRatingStars() {
    const stars = document.querySelectorAll('.rating-stars .star');
    if (!stars.length) return;
    
    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(stars, rating);
        });
        
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            document.getElementById('ratingScore').value = rating;
            updateRatingText(rating);
        });
    });
    
    // Reset stars on mouse leave
    const ratingContainer = document.querySelector('.rating-stars');
    if (ratingContainer) {
        ratingContainer.addEventListener('mouseleave', function() {
            const selectedRating = parseInt(document.getElementById('ratingScore').value) || 0;
            const stars = this.querySelectorAll('.star');
            highlightStars(stars, selectedRating);
        });
    }
}

// Highlight stars up to the given rating
function highlightStars(stars, rating) {
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('fa-star-o');
            star.classList.add('fa-star');
            star.style.color = '#ffd700';
        } else {
            star.classList.remove('fa-star');
            star.classList.add('fa-star-o');
            star.style.color = '#ddd';
        }
    });
}

// Update rating text based on selected rating
function updateRatingText(rating) {
    const ratingTexts = [
        '',
        'Poor',
        'Fair',
        'Good',
        'Very Good',
        'Excellent'
    ];
    
    const ratingTextElement = document.getElementById('ratingText');
    if (ratingTextElement) {
        ratingTextElement.textContent = ratingTexts[rating] || 'Tap to rate';
    }
}

// Initialize rating modal
function initializeRatingModal() {
    const submitRatingBtn = document.getElementById('submitRating');
    if (submitRatingBtn) {
        submitRatingBtn.addEventListener('click', submitRating);
    }
}

// Submit rating
function submitRating() {
    const rating = parseInt(document.getElementById('ratingScore').value);
    const comment = document.getElementById('ratingComment').value;
    const itemId = new URLSearchParams(window.location.search).get('id');
    const sellerId = document.body.getAttribute('data-seller-id');
    
    if (!rating) {
        alert('Please select a rating');
        return;
    }
    
    fetch('/api/ratings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            sellerId: sellerId,
            itemId: itemId,
            score: rating,
            comment: comment
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to submit rating');
        }
        return response.json();
    })
    .then(data => {
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('ratingModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show success message
        alert('Thank you for your rating!');
        
        // Refresh the rating display
        if (sellerId) {
            fetchSellerRating(sellerId);
        }
    })
    .catch(error => {
        console.error('Error submitting rating:', error);
        alert('Failed to submit rating. Please try again.');
    });
}

function goBack() {
    window.location.href = "items.html";
}
