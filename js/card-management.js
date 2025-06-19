// Card Management Alpine.js Component
function cardManagement() {
    return {
        // Component data
        cards: [],
        decks: [],
        selectedDeck: null,
        filteredCards: [],
        isLoading: true,
        message: '',
        messageType: 'success',
        totalCards: 0,

        // Edit modal data
        editingCard: null,
        editData: {
            prompt: '',
            response: '',
            tags: ''
        },

        // Initialize component
        async init() {
            console.log('Card management component initialized');
            await this.initDatabase();
            await this.loadCards();
            this.buildDecks();
            this.initFocusMode();
        },

        // Initialize Database (Dexie)
        async initDatabase() {
            try {
                await MimirDB.init();
                console.log('Database initialized for card management');
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
                    console.log('Card Management: Focus mode entered');
                });

                window.FocusMode.onExit(() => {
                    console.log('Card Management: Focus mode exited');
                });
            }
        },

        // Load all cards from database
        async loadCards() {
            try {
                this.isLoading = true;
                this.cards = await MimirDB.getAllCards();
                this.totalCards = this.cards.length;
                console.log('Loaded cards:', this.cards);
            } catch (error) {
                console.error('Failed to load cards:', error);
                this.showMessage('Failed to load cards', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // Build deck list from cards
        buildDecks() {
            const deckMap = new Map();

            // Count cards without tags
            const untaggedCount = this.cards.filter(card => !card.tags || card.tags.length === 0).length;
            if (untaggedCount > 0) {
                deckMap.set('None', untaggedCount);
            }

            // Count cards by tag
            this.cards.forEach(card => {
                if (card.tags && card.tags.length > 0) {
                    card.tags.forEach(tag => {
                        deckMap.set(tag, (deckMap.get(tag) || 0) + 1);
                    });
                }
            });

            // Convert to array and sort
            this.decks = Array.from(deckMap.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => {
                    // Put "None" first, then alphabetical
                    if (a.name === 'None') return -1;
                    if (b.name === 'None') return 1;
                    return a.name.localeCompare(b.name);
                });

            console.log('Built decks:', this.decks);
        },

        // Select a deck and filter cards
        selectDeck(deckName) {
            this.selectedDeck = deckName;

            if (deckName === 'None') {
                this.filteredCards = this.cards.filter(card => !card.tags || card.tags.length === 0);
            } else {
                this.filteredCards = this.cards.filter(card =>
                    card.tags && card.tags.includes(deckName)
                );
            }

            console.log(`Selected deck: ${deckName}, filtered cards:`, this.filteredCards);
        },

        // Edit a card
        editCard(card) {
            this.editingCard = card;
            this.editData = {
                prompt: card.prompt,
                response: card.response,
                tags: card.tags ? card.tags.join(', ') : ''
            };
        },

        // Save edited card
        async saveEdit() {
            try {
                const updatedCard = {
                    ...this.editingCard,
                    prompt: this.editData.prompt.trim(),
                    response: this.editData.response.trim(),
                    tags: this.parseTags(this.editData.tags),
                    updated_at: new Date().toISOString()
                };

                await this.updateCardInDatabase(updatedCard);

                // Update local data
                const index = this.cards.findIndex(c => c.card_id === updatedCard.card_id);
                if (index !== -1) {
                    this.cards[index] = updatedCard;
                }

                this.buildDecks();
                if (this.selectedDeck) {
                    this.selectDeck(this.selectedDeck);
                }

                this.editingCard = null;
                this.showMessage('Card updated successfully!', 'success');
            } catch (error) {
                console.error('Failed to update card:', error);
                this.showMessage('Failed to update card', 'error');
            }
        },

        // Cancel edit
        cancelEdit() {
            this.editingCard = null;
            this.editData = { prompt: '', response: '', tags: '' };
        },

        // Delete a card
        async deleteCard(cardId) {
            if (!confirm('Are you sure you want to delete this card?')) {
                return;
            }

            try {
                await this.deleteCardFromDatabase(cardId);

                // Update local data
                this.cards = this.cards.filter(c => c.card_id !== cardId);
                this.totalCards = this.cards.length;
                this.buildDecks();

                if (this.selectedDeck) {
                    this.selectDeck(this.selectedDeck);
                }

                this.showMessage('Card deleted successfully!', 'success');
            } catch (error) {
                console.error('Failed to delete card:', error);
                this.showMessage('Failed to delete card', 'error');
            }
        },

        // Update card in database (Dexie)
        async updateCardInDatabase(card) {
            return await MimirDB.updateCard(card);
        },

        // Delete card from database (Dexie)
        async deleteCardFromDatabase(cardId) {
            return await MimirDB.deleteCard(cardId);
        },

        // Parse tags from string input
        parseTags(tagsString) {
            if (!tagsString || !tagsString.trim()) {
                return [];
            }

            return tagsString
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .map(tag => tag.toLowerCase());
        },

        // Format date for display
        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString();
        },

        // Format due date with status indicator
        formatDueDate(card) {
            if (!card.due_date) return 'Not scheduled';

            const dueDate = new Date(card.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                return `Overdue (${Math.abs(diffDays)} days)`;
            } else if (diffDays === 0) {
                return 'Due today';
            } else if (diffDays === 1) {
                return 'Due tomorrow';
            } else {
                return `Due in ${diffDays} days`;
            }
        },

        // Get due date status class for styling
        getDueDateClass(card) {
            if (!card.due_date) return 'due-unknown';

            const daysUntilDue = SpacedRepetitionScheduler.getDaysUntilDue(card);

            if (daysUntilDue < 0) return 'due-overdue';
            if (daysUntilDue === 0) return 'due-today';
            if (daysUntilDue <= 3) return 'due-soon';
            return 'due-future';
        },

        // Get review statistics
        getReviewStats() {
            return SpacedRepetitionScheduler.getReviewStats(this.cards);
        },

        // Get cards due for review
        getDueCards() {
            return SpacedRepetitionScheduler.getDueCards(this.cards);
        },

        // Get overdue cards
        getOverdueCards() {
            return SpacedRepetitionScheduler.getOverdueCards(this.cards);
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
