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
        db: null,

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
        },

        // Initialize IndexedDB
        async initDatabase() {
            try {
                this.db = await this.openDatabase();
                console.log('Database initialized for card management');
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
                        
                        // Add tags index if it doesn't exist
                        if (!store.indexNames.contains('tags')) {
                            store.createIndex('tags', 'tags', { unique: false });
                        }
                    }
                };
            });
        },

        // Load all cards from database
        async loadCards() {
            try {
                this.isLoading = true;
                this.cards = await this.getAllCards();
                console.log('Loaded cards:', this.cards);
            } catch (error) {
                console.error('Failed to load cards:', error);
                this.showMessage('Failed to load cards', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // Get all cards from IndexedDB
        getAllCards() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cards'], 'readonly');
                const store = transaction.objectStore('cards');
                const request = store.getAll();

                request.onsuccess = () => {
                    // Ensure all cards have tags array (for backward compatibility)
                    const cards = request.result.map(card => ({
                        ...card,
                        tags: card.tags || []
                    }));
                    resolve(cards);
                };
                request.onerror = () => reject(request.error);
            });
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

        // Delete card from IndexedDB
        deleteCardFromDatabase(cardId) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cards'], 'readwrite');
                const store = transaction.objectStore('cards');
                const request = store.delete(cardId);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
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
