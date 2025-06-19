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
            this.initFocusMode();
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

        // Initialize focus mode integration
        initFocusMode() {
            if (typeof window.FocusMode !== 'undefined') {
                // Register callbacks for focus mode changes
                window.FocusMode.onEnter(() => {
                    console.log('Card Review: Focus mode entered');
                    // Auto-focus on show answer button if available
                    setTimeout(() => {
                        const showAnswerBtn = document.querySelector('.show-answer-btn');
                        if (showAnswerBtn && !this.showingAnswer) {
                            showAnswerBtn.focus();
                        }
                    }, 300);
                });

                window.FocusMode.onExit(() => {
                    console.log('Card Review: Focus mode exited');
                });
            }
        },

        // Load cards due for review
        async loadDueCards() {
            try {
                this.isLoading = true;
                this.allCards = await MimirDB.getAllCards();
                this.totalCards = this.allCards.length;

                console.log('All cards loaded:', this.allCards.length);
                console.log('All cards:', this.allCards);

                // Get cards due for review
                this.dueCards = SpacedRepetitionScheduler.getDueCards(this.allCards);

                console.log('Due cards after filtering:', this.dueCards.length);
                console.log('Due cards:', this.dueCards);

                // Debug: Check each card's due status
                this.allCards.forEach(card => {
                    const isDue = SpacedRepetitionScheduler.isCardDue(card);
                    const daysUntilDue = SpacedRepetitionScheduler.getDaysUntilDue(card);
                    console.log(`Card ${card.card_id}: due_date=${card.due_date}, isDue=${isDue}, daysUntilDue=${daysUntilDue}`);
                });

                // Sort by due date (earliest first)
                this.dueCards = SpacedRepetitionScheduler.sortCardsByDueDate(this.dueCards);

                console.log('Final due cards after sorting:', this.dueCards);

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
                console.log('Starting review for card:', this.currentCard.card_id, 'Success:', success);

                // Schedule the card for next review
                const updatedCard = SpacedRepetitionScheduler.scheduleCard(this.currentCard, success);
                console.log('Scheduled card:', updatedCard);

                // Save the updated card to database
                console.log('Attempting to update card in database...');
                await this.updateCardInDatabase(updatedCard);
                console.log('Card successfully updated in database');

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
                console.error('Error details:', error.message);
                console.error('Current card:', this.currentCard);
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
