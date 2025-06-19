// Card Learning Alpine.js Component
function cardLearning() {
    return {
        // Component data
        allCards: [],
        deckCards: [],
        selectedDeck: null,
        learningSession: null,
        currentCard: null,
        showingAnswer: false,
        isLoading: true,
        isLearning: false,
        message: '',
        messageType: 'success',
        
        // Session stats
        sessionStats: {
            totalCards: 0,
            graduatedCards: 0,
            remainingCards: 0,
            completionPercentage: 0,
            isComplete: false
        },
        
        // Timer for next card
        nextCardTimer: null,
        timeUntilNext: 0,
        
        // Initialize component
        async init() {
            console.log('Card learning component initialized');
            
            // Get deck from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            this.selectedDeck = urlParams.get('deck');
            
            await this.initDatabase();
            await this.loadCards();
            
            if (this.selectedDeck) {
                this.filterCardsByDeck();
                if (this.deckCards.length > 0) {
                    this.startLearningSession();
                }
            }
            
            this.initFocusMode();
        },

        // Initialize Database (Dexie)
        async initDatabase() {
            try {
                await MimirDB.init();
                console.log('Database initialized for card learning');
            } catch (error) {
                console.error('Failed to initialize database:', error);
                this.showMessage('Failed to initialize database', 'error');
            }
        },

        // Load all cards
        async loadCards() {
            try {
                this.isLoading = true;
                this.allCards = await MimirDB.getAllCards();
                console.log('All cards loaded for learning:', this.allCards.length);
            } catch (error) {
                console.error('Failed to load cards:', error);
                this.showMessage('Failed to load cards', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // Filter cards by selected deck
        filterCardsByDeck() {
            if (!this.selectedDeck) {
                this.deckCards = [];
                return;
            }

            if (this.selectedDeck === 'None') {
                this.deckCards = this.allCards.filter(card => !card.tags || card.tags.length === 0);
            } else {
                this.deckCards = this.allCards.filter(card =>
                    card.tags && card.tags.includes(this.selectedDeck)
                );
            }

            console.log(`Filtered cards for deck "${this.selectedDeck}":`, this.deckCards.length);
        },

        // Start learning session
        startLearningSession() {
            if (this.deckCards.length === 0) {
                this.showMessage('No cards found in this deck', 'error');
                return;
            }

            this.learningSession = LearningScheduler.initializeLearningSession(this.deckCards);
            this.isLearning = true;
            this.updateSessionStats();
            this.loadNextCard();
            
            console.log('Learning session started:', this.learningSession);
            this.showMessage(`Learning session started with ${this.deckCards.length} cards`, 'success');
        },

        // Load next card for learning
        loadNextCard() {
            if (!this.learningSession) return;

            this.currentCard = LearningScheduler.getNextCard(this.learningSession);
            this.showingAnswer = false;
            
            if (!this.currentCard) {
                // Session complete
                this.completeLearningSession();
                return;
            }

            // Check if we need to wait for the next card
            if (!LearningScheduler.isCardDue(this.currentCard)) {
                this.startNextCardTimer();
            }

            console.log('Next card loaded:', this.currentCard.card_id);
        },

        // Start timer for next card
        startNextCardTimer() {
            if (this.nextCardTimer) {
                clearInterval(this.nextCardTimer);
            }

            this.updateTimeUntilNext();
            
            this.nextCardTimer = setInterval(() => {
                this.updateTimeUntilNext();
                
                if (this.timeUntilNext <= 0) {
                    clearInterval(this.nextCardTimer);
                    this.nextCardTimer = null;
                    this.loadNextCard();
                }
            }, 1000);
        },

        // Update time until next card
        updateTimeUntilNext() {
            if (!this.learningSession) {
                this.timeUntilNext = 0;
                return;
            }
            
            this.timeUntilNext = LearningScheduler.getTimeUntilNextCard(this.learningSession);
        },

        // Show answer
        showAnswer() {
            this.showingAnswer = true;
        },

        // Review card in learning mode
        async reviewCard(success) {
            if (!this.currentCard || !this.learningSession) return;

            console.log('Learning review for card:', this.currentCard.card_id, 'Success:', success);

            // Process the review
            this.learningSession = LearningScheduler.processCardReview(
                this.learningSession, 
                this.currentCard.card_id, 
                success
            );

            // Update session stats
            this.updateSessionStats();

            // Show feedback message
            if (success) {
                const card = this.learningSession.cards.find(c => c.card_id === this.currentCard.card_id);
                if (card.isGraduated) {
                    this.showMessage('Card graduated! 🎉', 'success');
                } else {
                    this.showMessage('Good! Card will return in 20 seconds', 'success');
                }
            } else {
                this.showMessage('Try again - card moved to back of queue', 'info');
            }

            // Load next card
            setTimeout(() => {
                this.loadNextCard();
            }, 1000);
        },

        // Update session statistics
        updateSessionStats() {
            if (!this.learningSession) return;
            
            this.sessionStats = LearningScheduler.getSessionStats(this.learningSession);
        },

        // Complete learning session
        completeLearningSession() {
            this.isLearning = false;
            this.currentCard = null;
            this.showingAnswer = false;
            
            if (this.nextCardTimer) {
                clearInterval(this.nextCardTimer);
                this.nextCardTimer = null;
            }
            
            this.showMessage('🎉 Learning session complete! All cards graduated!', 'success');
            console.log('Learning session completed');
        },

        // End learning session early
        endLearningSession() {
            if (confirm('Are you sure you want to end this learning session?')) {
                this.completeLearningSession();
            }
        },

        // Initialize focus mode
        initFocusMode() {
            if (typeof initializeFocusMode === 'function') {
                initializeFocusMode();
            }
        },

        // Show message to user
        showMessage(text, type = 'success') {
            this.message = text;
            this.messageType = type;

            // Auto-hide success messages after 3 seconds
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    this.clearMessage();
                }, 3000);
            }
        },

        // Clear message
        clearMessage() {
            this.message = '';
        },

        // Format time display
        formatTime(seconds) {
            if (seconds <= 0) return '0s';
            if (seconds < 60) return `${seconds}s`;
            
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
    };
}
