/**
 * Rating Modal Component
 * Handles the UI for submitting and updating ratings
 */
class RatingModal {
    constructor() {
        this.modalId = 'ratingModal';
        this.ratingService = window.ratingService || new RatingService();
        this.currentTransactionId = null;
        this.ratingData = { score: 0, comment: '' };
        this.initialize();
    }

    initialize() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById(this.modalId)) {
            const modalHTML = `
                <div class="modal fade" id="${this.modalId}" tabindex="-1" role="dialog" aria-labelledby="ratingModalLabel" aria-hidden="true">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="ratingModalLabel">Rate This Transaction</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <form id="ratingForm">
                                    <div class="form-group">
                                        <label>Your Rating</label>
                                        <div class="rating-stars mb-3">
                                            ${[1, 2, 3, 4, 5].map(star => `
                                                <i class="far fa-star" data-rating="${star}" 
                                                   style="font-size: 2rem; cursor: pointer; color: #ffc107; margin-right: 5px;"></i>
                                            `).join('')}
                                            <input type="hidden" id="ratingScore" name="score" value="0" required>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="ratingComment">Your Review (Optional)</label>
                                        <textarea class="form-control" id="ratingComment" name="comment" rows="3" 
                                                  placeholder="Share your experience..."></textarea>
                                    </div>
                                    <div class="alert alert-danger d-none" id="ratingError"></div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="submitRating">Submit Rating</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.attachEventListeners();
        }
        
        this.modalElement = $(`#${this.modalId}`);
    }

    attachEventListeners() {
        // Star rating interaction
        $(document).on('mouseover', `.rating-stars .fa-star`, (e) => {
            const rating = parseInt($(e.target).data('rating'));
            this.highlightStars(rating);
        });

        $(document).on('mouseout', '.rating-stars', () => {
            this.highlightStars(this.ratingData.score || 0);
        });

        $(document).on('click', '.rating-stars .fa-star', (e) => {
            const rating = parseInt($(e.target).data('rating'));
            this.ratingData.score = rating;
            $('#ratingScore').val(rating);
            this.highlightStars(rating);
        });

        // Form submission
        $(document).on('click', '#submitRating', async () => {
            await this.submitRating();
        });

        // Reset form when modal is closed
        this.modalElement.on('hidden.bs.modal', () => {
            this.resetForm();
        });
    }

    highlightStars(count) {
        $(`.rating-stars .fa-star`).each((index, star) => {
            const starRating = parseInt($(star).data('rating'));
            if (starRating <= count) {
                $(star).removeClass('far').addClass('fas');
            } else {
                $(star).removeClass('fas').addClass('far');
            }
        });
    }

    async show(transactionId) {
        this.currentTransactionId = transactionId;
        this.resetForm();
        
        try {
            // Check if there's an existing rating
            const existingRating = await this.ratingService.getRatingForTransaction(transactionId);
            
            if (existingRating) {
                this.ratingData = {
                    score: existingRating.score,
                    comment: existingRating.comment || ''
                };
                
                // Update form with existing rating
                $('#ratingScore').val(this.ratingData.score);
                $('#ratingComment').val(this.ratingData.comment);
                this.highlightStars(this.ratingData.score);
                
                // Update UI for editing
                $('#ratingModalLabel').text('Update Your Rating');
                $('#submitRating').text('Update Rating');
            } else {
                // Reset for new rating
                $('#ratingModalLabel').text('Rate This Transaction');
                $('#submitRating').text('Submit Rating');
            }
            
            this.modalElement.modal('show');
        } catch (error) {
            console.error('Error preparing rating form:', error);
            this.showError('Failed to load rating form. Please try again.');
        }
    }

    resetForm() {
        this.ratingData = { score: 0, comment: '' };
        $('#ratingScore').val(0);
        $('#ratingComment').val('');
        this.highlightStars(0);
        $('#ratingError').addClass('d-none').text('');
    }

    async submitRating() {
        const score = parseInt($('#ratingScore').val());
        const comment = $('#ratingComment').val().trim();
        
        // Validate form
        if (score < 1 || score > 5) {
            this.showError('Please select a rating between 1 and 5 stars.');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = $('#submitRating');
            const originalText = submitBtn.html();
            submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...');
            
            // Submit rating
            const rating = await this.ratingService.rateTransaction(
                this.currentTransactionId,
                { score, comment }
            );
            
            // Show success message
            this.showSuccess('Thank you for your rating!');
            
            // Close modal after a short delay
            setTimeout(() => {
                this.modalElement.modal('hide');
                
                // Trigger custom event to notify other components
                const event = new CustomEvent('ratingSubmitted', { 
                    detail: { 
                        transactionId: this.currentTransactionId, 
                        rating 
                    } 
                });
                document.dispatchEvent(event);
                
            }, 1000);
            
        } catch (error) {
            console.error('Error submitting rating:', error);
            this.showError(error.message || 'Failed to submit rating. Please try again.');
        } finally {
            // Reset button state
            const submitBtn = $('#submitRating');
            submitBtn.prop('disabled', false).html('Submit Rating');
        }
    }
    
    showError(message) {
        const errorElement = $('#ratingError');
        errorElement.removeClass('d-none').text(message);
        errorElement[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    showSuccess(message) {
        // You can implement a toast notification or update the UI as needed
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message); // Fallback
        }
    }
}

// Create and export a singleton instance
const ratingModal = new RatingModal();
window.ratingModal = ratingModal; // Make it globally available
export default ratingModal;
