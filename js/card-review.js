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
        db: null,
        totalCards: 0,

        // Initialize component
        async init() {
            console.log('Card review component initialized');
            await this.initDatabase();
            await this.loadDueCards();
        },

        // Initialize IndexedDB
        async initDatabase() {
            try {
                this.db = await this.openDatabase();
                console.log('Database initialized for card review');
            } catch (error) {
                console.error('Failed to initialize database:', error);
                this.showMessage('Failed to initialize database', 'error');
            }
        },

        // Open IndexedDB connection
        openDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Create cards object store if it doesn't exist
                    if (!db.objectStoreNames.contains('cards')) {
                        const store = db.createObjectStore('cards', {
                            keyPath: DB_CONFIG.stores.cards.keyPath
                        });

                        // Create indexes
                        DB_CONFIG.stores.cards.indexes.forEach(index => {
                            store.createIndex(index.name, index.name, { unique: index.unique });
                        });
                    } else {
                        // Handle schema updates for existing database
                        const transaction = event.target.transaction;
                        const store = transaction.objectStore('cards');

                        // Add new indexes if they don't exist
                        if (!store.indexNames.contains('tags')) {
                            store.createIndex('tags', 'tags', { unique: false });
                        }
                        if (!store.indexNames.contains('due_date')) {
                            store.createIndex('due_date', 'due_date', { unique: false });
                        }
                        if (!store.indexNames.contains('review_interval')) {
                            store.createIndex('review_interval', 'review_interval', { unique: false });
                        }
                    }
                };
            });
        },

        // Load cards due for review
        async loadDueCards() {
            try {
                this.isLoading = true;
                this.allCards = await this.getAllCards();
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

        // Get all cards from IndexedDB
        getAllCards() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cards'], 'readwrite');
                const store = transaction.objectStore('cards');
                const request = store.getAll();

                request.onsuccess = () => {
                    // Ensure all cards have required fields (for backward compatibility)
                    const cards = request.result.map(card => {
                        let updatedCard = {
                            ...card,
                            tags: card.tags || []
                        };

                        // Migrate cards that don't have scheduling fields
                        if (!card.due_date || !card.hasOwnProperty('review_interval')) {
                            updatedCard = SpacedRepetitionScheduler.initializeCard(updatedCard);
                            
                            // Save the migrated card back to the database
                            store.put(updatedCard);
                            console.log('Migrated card to include scheduling fields:', updatedCard.card_id);
                        }

                        return updatedCard;
                    });
                    resolve(cards);
                };
                request.onerror = () => reject(request.error);
            });
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

        // Update card in IndexedDB
        updateCardInDatabase(card) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cards'], 'readwrite');
                const store = transaction.objectStore('cards');
                const request = store.put(card);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
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
