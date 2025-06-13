// Spaced Repetition Scheduler
// Implements 2^n day scheduling where n starts at 0 and increments with each successful review

class SpacedRepetitionScheduler {
    /**
     * Calculate the next due date based on review interval
     * @param {number} reviewInterval - The current interval (n in 2^n formula)
     * @param {Date} baseDate - The date to calculate from (defaults to now)
     * @returns {string} ISO string of the due date
     */
    static calculateNextDueDate(reviewInterval = 0, baseDate = new Date()) {
        const daysToAdd = Math.pow(2, reviewInterval);
        const dueDate = new Date(baseDate);
        dueDate.setUTCDate(dueDate.getUTCDate() + daysToAdd);

        // Set to start of day in UTC to avoid timezone issues
        dueDate.setUTCHours(0, 0, 0, 0);

        return dueDate.toISOString();
    }

    /**
     * Schedule a card for its next review
     * @param {Object} card - The card object to schedule
     * @param {boolean} success - Whether the review was successful
     * @returns {Object} Updated card object with new due date and interval
     */
    static scheduleCard(card, success = true) {
        const now = new Date();
        const updatedCard = { ...card };

        if (success) {
            // Increment the review interval for successful reviews
            const newInterval = (card.review_interval || 0) + 1;
            updatedCard.review_interval = newInterval;
            updatedCard.due_date = this.calculateNextDueDate(newInterval, now);
        } else {
            // Reset to interval 0 for failed reviews (back to 1 day)
            updatedCard.review_interval = 0;
            updatedCard.due_date = this.calculateNextDueDate(0, now);
        }

        // Update review tracking fields
        updatedCard.last_reviewed = now.toISOString();
        updatedCard.review_count = (card.review_count || 0) + 1;
        updatedCard.updated_at = now.toISOString();

        return updatedCard;
    }

    /**
     * Initialize a new card with default scheduling values
     * @param {Object} card - The card object to initialize
     * @returns {Object} Card with initial scheduling fields
     */
    static initializeCard(card) {
        const now = new Date();
        return {
            ...card,
            due_date: this.calculateNextDueDate(0, now), // Due tomorrow (2^0 = 1 day)
            review_interval: 0,
            review_count: 0,
            last_reviewed: null
        };
    }

    /**
     * Check if a card is due for review
     * @param {Object} card - The card to check
     * @param {Date} checkDate - The date to check against (defaults to now)
     * @returns {boolean} True if the card is due
     */
    static isCardDue(card, checkDate = new Date()) {
        if (!card.due_date) return true; // Cards without due dates are considered due

        const dueDate = new Date(card.due_date);
        const today = new Date(checkDate);
        today.setUTCHours(0, 0, 0, 0); // Start of day in UTC

        return dueDate <= today;
    }

    /**
     * Check if a card is overdue
     * @param {Object} card - The card to check
     * @param {Date} checkDate - The date to check against (defaults to now)
     * @returns {boolean} True if the card is overdue
     */
    static isCardOverdue(card, checkDate = new Date()) {
        if (!card.due_date) return false;

        const dueDate = new Date(card.due_date);
        const today = new Date(checkDate);
        today.setUTCHours(0, 0, 0, 0);

        return dueDate < today;
    }

    /**
     * Get the number of days until a card is due
     * @param {Object} card - The card to check
     * @param {Date} checkDate - The date to check from (defaults to now)
     * @returns {number} Days until due (negative if overdue)
     */
    static getDaysUntilDue(card, checkDate = new Date()) {
        if (!card.due_date) return 0;

        const dueDate = new Date(card.due_date);
        const today = new Date(checkDate);
        today.setUTCHours(0, 0, 0, 0);
        dueDate.setUTCHours(0, 0, 0, 0);

        const diffTime = dueDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Filter cards that are due for review
     * @param {Array} cards - Array of card objects
     * @param {Date} checkDate - The date to check against (defaults to now)
     * @returns {Array} Array of cards that are due
     */
    static getDueCards(cards, checkDate = new Date()) {
        return cards.filter(card => this.isCardDue(card, checkDate));
    }

    /**
     * Filter cards that are overdue
     * @param {Array} cards - Array of card objects
     * @param {Date} checkDate - The date to check against (defaults to now)
     * @returns {Array} Array of cards that are overdue
     */
    static getOverdueCards(cards, checkDate = new Date()) {
        return cards.filter(card => this.isCardOverdue(card, checkDate));
    }

    /**
     * Get cards due today (including overdue)
     * @param {Array} cards - Array of card objects
     * @param {Date} checkDate - The date to check against (defaults to now)
     * @returns {Array} Array of cards due today or overdue
     */
    static getCardsDueToday(cards, checkDate = new Date()) {
        return this.getDueCards(cards, checkDate);
    }

    /**
     * Sort cards by due date (earliest first)
     * @param {Array} cards - Array of card objects
     * @returns {Array} Sorted array of cards
     */
    static sortCardsByDueDate(cards) {
        return [...cards].sort((a, b) => {
            // Cards without due dates go to the end
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;

            return new Date(a.due_date) - new Date(b.due_date);
        });
    }

    /**
     * Get review statistics for a set of cards
     * @param {Array} cards - Array of card objects
     * @returns {Object} Statistics object
     */
    static getReviewStats(cards) {
        const now = new Date();
        const dueCards = this.getDueCards(cards, now);
        const overdueCards = this.getOverdueCards(cards, now);

        return {
            total: cards.length,
            due: dueCards.length,
            overdue: overdueCards.length,
            upToDate: cards.length - dueCards.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpacedRepetitionScheduler;
}
