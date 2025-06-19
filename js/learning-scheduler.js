// Learning Mode Scheduler
// Handles learning session logic with 20-second intervals and session-based graduation

class LearningScheduler {
    /**
     * Initialize a learning session for a deck
     * @param {Array} cards - Cards in the deck to learn
     * @returns {Object} Learning session object
     */
    static initializeLearningSession(cards) {
        const session = {
            sessionId: Date.now().toString(),
            startTime: new Date().toISOString(),
            cards: cards.map(card => ({
                ...card,
                sessionSuccessCount: 0,
                isGraduated: false,
                lastAttemptTime: null,
                nextDueTime: new Date().toISOString() // Available immediately
            })),
            completedCards: [],
            currentQueue: [],
            isComplete: false
        };

        // Initialize the current queue with all cards
        session.currentQueue = [...session.cards];

        return session;
    }

    /**
     * Get the next card due for learning
     * @param {Object} session - Learning session object
     * @returns {Object|null} Next card to review or null if session complete
     */
    static getNextCard(session) {
        const now = new Date();

        // Filter cards that are due now and not graduated
        const dueCards = session.currentQueue.filter(card =>
            !card.isGraduated && new Date(card.nextDueTime) <= now
        );

        if (dueCards.length === 0) {
            // Check if all cards are graduated
            const allGraduated = session.cards.every(card => card.isGraduated);
            if (allGraduated) {
                session.isComplete = true;
                return null;
            }

            // Return the card with the earliest due time
            const nextCard = session.currentQueue
                .filter(card => !card.isGraduated)
                .sort((a, b) => new Date(a.nextDueTime) - new Date(b.nextDueTime))[0];

            return nextCard || null;
        }

        // Return the first due card
        return dueCards[0];
    }

    /**
     * Process a card review in learning mode
     * @param {Object} session - Learning session object
     * @param {string} cardId - ID of the reviewed card
     * @param {boolean} success - Whether the review was successful
     * @returns {Object} Updated session object
     */
    static processCardReview(session, cardId, success) {
        const cardIndex = session.cards.findIndex(card => card.card_id === cardId);
        if (cardIndex === -1) {
            console.error('Card not found in learning session:', cardId);
            return session;
        }

        const card = session.cards[cardIndex];
        const now = new Date();

        card.lastAttemptTime = now.toISOString();

        if (success) {
            card.sessionSuccessCount++;

            // Graduate after 2 successful attempts
            if (card.sessionSuccessCount >= 2) {
                card.isGraduated = true;
                session.completedCards.push(card);

                // Remove from current queue
                session.currentQueue = session.currentQueue.filter(c => c.card_id !== cardId);

                console.log(`Card ${cardId} graduated from learning session`);
            } else {
                // Schedule for 20 seconds later
                const nextDue = new Date(now.getTime() + 20 * 1000);
                card.nextDueTime = nextDue.toISOString();

                console.log(`Card ${cardId} scheduled for 20 seconds later`);
            }
        } else {
            // Reset success count and shuffle to back of queue
            card.sessionSuccessCount = 0;
            card.nextDueTime = now.toISOString(); // Available immediately

            // Move to end of queue (shuffle to back)
            const queueIndex = session.currentQueue.findIndex(c => c.card_id === cardId);
            if (queueIndex !== -1) {
                const [removedCard] = session.currentQueue.splice(queueIndex, 1);
                session.currentQueue.push(removedCard);
            }

            console.log(`Card ${cardId} failed - shuffled to back of queue`);
        }

        // Update the card in the session
        session.cards[cardIndex] = card;

        return session;
    }

    /**
     * Get learning session statistics
     * @param {Object} session - Learning session object
     * @returns {Object} Session statistics
     */
    static getSessionStats(session) {
        const totalCards = session.cards.length;
        const graduatedCards = session.cards.filter(card => card.isGraduated).length;
        const remainingCards = totalCards - graduatedCards;

        return {
            totalCards,
            graduatedCards,
            remainingCards,
            completionPercentage: Math.round((graduatedCards / totalCards) * 100),
            isComplete: session.isComplete
        };
    }

    /**
     * Check if a card is due for review in learning mode
     * @param {Object} card - Card object from learning session
     * @returns {boolean} Whether the card is due
     */
    static isCardDue(card) {
        if (card.isGraduated) return false;
        return new Date(card.nextDueTime) <= new Date();
    }

    /**
     * Get time until next card is due
     * @param {Object} session - Learning session object
     * @returns {number} Seconds until next card is due, or 0 if cards are due now
     */
    static getTimeUntilNextCard(session) {
        const now = new Date();
        const nonGraduatedCards = session.cards.filter(card => !card.isGraduated);

        if (nonGraduatedCards.length === 0) return 0;

        const nextDueTimes = nonGraduatedCards.map(card => new Date(card.nextDueTime));
        const earliestDue = Math.min(...nextDueTimes);

        const timeDiff = earliestDue - now.getTime();
        return Math.max(0, Math.ceil(timeDiff / 1000));
    }
}
