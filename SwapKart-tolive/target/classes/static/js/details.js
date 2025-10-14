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
    fetch(`/api/ratings/seller/${sellerId}/average`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    // No ratings yet
                    updateRatingUI(0, 0);
                    return null;
                }
                throw new Error('Failed to fetch seller rating');
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                updateRatingUI(data.averageRating, data.totalRatings);
            }
        })
        .catch(error => {
            console.error('Error fetching seller rating:', error);
            // Show default state on error
            updateRatingUI(0, 0);
        });
}

// Update the rating UI with the average rating
function updateRatingUI(averageRating, totalRatings) {
    const starContainer = document.querySelector('.star-rating-average');
    const averageRatingElement = document.querySelector('.average-rating');
    const ratingCountElement = document.querySelector('.rating-count');
    
    if (!starContainer || !averageRatingElement || !ratingCountElement) return;
    
    // Update average rating
    averageRatingElement.textContent = averageRating.toFixed(1);
    ratingCountElement.textContent = `(${totalRatings} ${totalRatings === 1 ? 'rating' : 'ratings'})`;
    
    // Update star display
    const stars = starContainer.querySelectorAll('i');
    stars.forEach((star, index) => {
        if (index < Math.floor(averageRating)) {
            star.classList.remove('fa-star-o', 'fa-star-half-o');
            star.classList.add('fa-star');
        } else if (index < Math.ceil(averageRating)) {
            star.classList.remove('fa-star-o', 'fa-star');
            star.classList.add('fa-star-half-o');
        } else {
            star.classList.remove('fa-star', 'fa-star-half-o');
            star.classList.add('fa-star-o');
        }
    });
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
