// Load seller rating summary and recent reviews when the item details modal is shown
(function () {
    'use strict';

    // Utility to escape HTML
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Update seller rating UI elements
    function updateSellerRatingUI(averageRating, totalRatings) {
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

    // Render reviews into the reviews list
    function renderSellerReviews(reviews) {
        const el = document.getElementById('sellerReviewsList');
        if (!el) return;
        if (!reviews || reviews.length === 0) {
            el.innerHTML = '<div class="text-muted small">No reviews yet.</div>';
            return;
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

        el.innerHTML = reviews.map(r => {
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
    }

    // Fetch summary
    function fetchRatingSummary(sellerId) {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        return fetch(`/api/ratings/seller/${sellerId}/summary`, { headers })
            .then(resp => {
                if (!resp.ok) {
                    if (resp.status === 404) return { averageRating: 0, ratingCount: 0 };
                    throw new Error('Failed to fetch seller rating summary');
                }
                return resp.json();
            })
            .catch(err => {
                console.error('fetchRatingSummary error:', err);
                return { averageRating: 0, ratingCount: 0 };
            });
    }

    // Fetch reviews
    function fetchReviews(sellerId, size = 5) {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        return fetch(`/api/ratings/seller/${sellerId}/reviews?size=${size}`, { headers })
            .then(resp => {
                if (!resp.ok) {
                    console.error('fetchReviews non-ok', resp.status);
                    return [];
                }
                return resp.json();
            })
            .catch(err => {
                console.error('fetchReviews error:', err);
                return [];
            });
    }

    // When modal shows, read seller id from messageSellerBtn and update UI
    document.addEventListener('DOMContentLoaded', function () {
        const modalEl = document.getElementById('itemDetailsModal');
        if (!modalEl) return;

        // Use Bootstrap 5 show.bs.modal event
        modalEl.addEventListener('show.bs.modal', async function () {
            try {
                const sellerBtn = document.getElementById('messageSellerBtn');
                const sellerId = sellerBtn ? sellerBtn.getAttribute('data-seller-id') : null;
                if (!sellerId) {
                    // no seller id available
                    updateSellerRatingUI(0, 0);
                    const listEl = document.getElementById('sellerReviewsList');
                    if (listEl) listEl.innerHTML = '<div class="text-muted small">No reviews available.</div>';
                    return;
                }

                const summary = await fetchRatingSummary(sellerId);
                updateSellerRatingUI(summary.averageRating, summary.ratingCount);

                const reviews = await fetchReviews(sellerId, 5);
                renderSellerReviews(reviews);

                // Initialize toggle button to hidden state
                const toggleBtn = document.getElementById('toggleSellerReviews');
                const reviewsList = document.getElementById('sellerReviewsList');
                if (toggleBtn && reviewsList) {
                    reviewsList.style.display = 'none';
                    toggleBtn.textContent = 'Show reviews';
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    toggleBtn.onclick = function () {
                        const isShown = reviewsList.style.display === 'block';
                        reviewsList.style.display = isShown ? 'none' : 'block';
                        toggleBtn.textContent = isShown ? 'Show reviews' : 'Hide reviews';
                        toggleBtn.setAttribute('aria-expanded', (!isShown).toString());
                    };
                }
            } catch (err) {
                console.error('Error in seller-ratings modal handler:', err);
            }
        });
    });

})();
