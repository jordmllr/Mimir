// Card Review Alpine.js Component
function cardReview() {
    return {
        // Component data
        allCards: [],
        dueCards: [],
        currentCard: null,
        currentCardIndex: 0,
        showingAnswer: false,
        isLoading: true,
        message: '',
        messageType: 'success',
        totalCards: 0,

        // Initialize component
        async init() {
            console.log('Card review component initialized');
            await this.initDatabase();
            await this.loadDueCards();
        },

        // Initialize Database (Dexie)
        async initDatabase() {
            try {
                await MimirDB.init();
                console.log('Database initialized for card review');
            } catch (error) {
                console.error('Failed to initialize database:', error);
                this.showMessage('Failed to initialize database', 'error');
            }
        },

        // Load cards due for review
        async loadDueCards() {
            try {
                this.isLoading = true;
                this.allCards = await MimirDB.getAllCards();
                this.totalCards = this.allCards.length;

                // Get cards due for review
                this.dueCards = SpacedRepetitionScheduler.getDueCards(this.allCards);

                // Sort by due date (earliest first)
                this.dueCards = SpacedRepetitionScheduler.sortCardsByDueDate(this.dueCards);

                console.log('Loaded due cards:', this.dueCards);

                if (this.dueCards.length > 0) {
                    this.currentCard = this.dueCards[0];
                    this.currentCardIndex = 0;
                }
            } catch (error) {
                console.error('Failed to load due cards:', error);
                this.showMessage('Failed to load cards', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // Show the answer for the current card
        showAnswer() {
            this.showingAnswer = true;
        },

        // Review the current card
        async reviewCard(success) {
            if (!this.currentCard) return;

            try {
                // Schedule the card for next review
                const updatedCard = SpacedRepetitionScheduler.scheduleCard(this.currentCard, success);

                // Save the updated card to database
                await this.updateCardInDatabase(updatedCard);

                // Update local data
                const cardIndex = this.allCards.findIndex(c => c.card_id === updatedCard.card_id);
                if (cardIndex !== -1) {
                    this.allCards[cardIndex] = updatedCard;
                }

                // Move to next card
                this.nextCard();

                const resultText = success ? 'Good' : 'Again';
                const nextDue = new Date(updatedCard.due_date).toLocaleDateString();
                this.showMessage(`${resultText}! Next review: ${nextDue}`, 'success');

            } catch (error) {
                console.error('Failed to review card:', error);
                this.showMessage('Failed to save review', 'error');
            }
        },

        // Move to the next card
        nextCard() {
            this.showingAnswer = false;
            this.currentCardIndex++;

            if (this.currentCardIndex < this.dueCards.length) {
                this.currentCard = this.dueCards[this.currentCardIndex];
            } else {
                // Review session complete
                this.dueCards = [];
                this.currentCard = null;
                this.showMessage('Review session complete! 🎉', 'success');
            }
        },

        // Update card in database (Dexie)
        async updateCardInDatabase(card) {
            return await MimirDB.updateCard(card);
        },

        // Show message to user
        showMessage(text, type = 'success') {
            this.message = text;
            this.messageType = type;

            // Auto-hide success messages after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    this.clearMessage();
                }, 3000);
            }
        },

        // Clear message
        clearMessage() {
            this.message = '';
        }
    };
}
