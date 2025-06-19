// Database Service - Unified data layer for Mimir
class DatabaseService {
    constructor() {
        this.db = new Dexie('MimirDB');
        this.initializeDatabase();
    }
    
    initializeDatabase() {
        // Define database schema
        this.db.version(1).stores({
            cards: '++id, prompt, response, tags, created, due, interval, easeFactor, deckId, lastReviewed',
            decks: '++id, name, path, type, created, cardCount'
        });
        
        // Open database
        this.db.open().catch(err => {
            console.error('Failed to open database:', err);
        });
        
        console.log('Database service initialized');
    }
    
    // Card operations
    async getAllCards() {
        try {
            return await this.db.cards.orderBy('created').reverse().toArray();
        } catch (error) {
            console.error('Failed to get all cards:', error);
            return [];
        }
    }
    
    async getCards(deckId = null) {
        try {
            if (deckId) {
                return await this.db.cards.where('deckId').equals(deckId).toArray();
            }
            return await this.getAllCards();
        } catch (error) {
            console.error('Failed to get cards:', error);
            return [];
        }
    }
    
    async getCard(cardId) {
        try {
            return await this.db.cards.get(cardId);
        } catch (error) {
            console.error('Failed to get card:', error);
            return null;
        }
    }
    
    async saveCard(cardData) {
        try {
            const card = {
                prompt: cardData.prompt.trim(),
                response: cardData.response.trim(),
                tags: cardData.tags ? cardData.tags.trim() : '',
                created: new Date(),
                due: new Date(), // New cards are due immediately
                interval: 1,
                easeFactor: 2.5,
                deckId: cardData.deckId || null,
                lastReviewed: null
            };
            
            const id = await this.db.cards.add(card);
            console.log('Card saved with ID:', id);
            
            // Update deck card count if card belongs to a deck
            if (card.deckId) {
                await this.updateDeckCardCount(card.deckId);
            }
            
            return id;
        } catch (error) {
            console.error('Failed to save card:', error);
            throw error;
        }
    }
    
    async updateCard(cardId, updates) {
        try {
            await this.db.cards.update(cardId, {
                ...updates,
                lastReviewed: new Date()
            });
            
            console.log('Card updated:', cardId);
            return true;
        } catch (error) {
            console.error('Failed to update card:', error);
            throw error;
        }
    }
    
    async deleteCard(cardId) {
        try {
            const card = await this.getCard(cardId);
            await this.db.cards.delete(cardId);
            
            // Update deck card count if card belonged to a deck
            if (card && card.deckId) {
                await this.updateDeckCardCount(card.deckId);
            }
            
            console.log('Card deleted:', cardId);
            return true;
        } catch (error) {
            console.error('Failed to delete card:', error);
            throw error;
        }
    }
    
    // Deck operations
    async getAllDecks() {
        try {
            const decks = await this.db.decks.orderBy('name').toArray();
            
            // Update card counts for all decks
            for (const deck of decks) {
                deck.cardCount = await this.getCardCount(deck.id);
            }
            
            return decks;
        } catch (error) {
            console.error('Failed to get all decks:', error);
            return [];
        }
    }
    
    async getDeck(deckId) {
        try {
            const deck = await this.db.decks.get(deckId);
            if (deck) {
                deck.cardCount = await this.getCardCount(deckId);
            }
            return deck;
        } catch (error) {
            console.error('Failed to get deck:', error);
            return null;
        }
    }
    
    async createDeck(name, path = '', type = 'flat') {
        try {
            const deck = {
                name: name.trim(),
                path: path.trim(),
                type,
                created: new Date(),
                cardCount: 0
            };
            
            const id = await this.db.decks.add(deck);
            console.log('Deck created with ID:', id);
            return id;
        } catch (error) {
            console.error('Failed to create deck:', error);
            throw error;
        }
    }
    
    async updateDeck(deckId, updates) {
        try {
            await this.db.decks.update(deckId, updates);
            console.log('Deck updated:', deckId);
            return true;
        } catch (error) {
            console.error('Failed to update deck:', error);
            throw error;
        }
    }
    
    async deleteDeck(deckId) {
        try {
            // First, remove deck association from all cards in this deck
            await this.db.cards.where('deckId').equals(deckId).modify({ deckId: null });
            
            // Then delete the deck
            await this.db.decks.delete(deckId);
            
            console.log('Deck deleted:', deckId);
            return true;
        } catch (error) {
            console.error('Failed to delete deck:', error);
            throw error;
        }
    }
    
    // Utility methods
    async getCardCount(deckId = null) {
        try {
            if (deckId) {
                return await this.db.cards.where('deckId').equals(deckId).count();
            } else {
                return await this.db.cards.count();
            }
        } catch (error) {
            console.error('Failed to get card count:', error);
            return 0;
        }
    }
    
    async updateDeckCardCount(deckId) {
        try {
            const count = await this.getCardCount(deckId);
            await this.updateDeck(deckId, { cardCount: count });
        } catch (error) {
            console.error('Failed to update deck card count:', error);
        }
    }
    
    // Search functionality
    async searchCards(query, deckId = null) {
        try {
            const searchTerm = query.toLowerCase().trim();
            if (!searchTerm) {
                return await this.getCards(deckId);
            }
            
            let cards;
            if (deckId) {
                cards = await this.db.cards.where('deckId').equals(deckId).toArray();
            } else {
                cards = await this.getAllCards();
            }
            
            return cards.filter(card => 
                card.prompt.toLowerCase().includes(searchTerm) ||
                card.response.toLowerCase().includes(searchTerm) ||
                (card.tags && card.tags.toLowerCase().includes(searchTerm))
            );
        } catch (error) {
            console.error('Failed to search cards:', error);
            return [];
        }
    }
    
    // Statistics
    async getStats() {
        try {
            const totalCards = await this.db.cards.count();
            const totalDecks = await this.db.decks.count();
            
            const now = new Date();
            const dueCards = await this.db.cards.where('due').belowOrEqual(now).count();
            
            const reviewedToday = await this.db.cards
                .where('lastReviewed')
                .above(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
                .count();
            
            return {
                totalCards,
                totalDecks,
                dueCards,
                reviewedToday
            };
        } catch (error) {
            console.error('Failed to get stats:', error);
            return {
                totalCards: 0,
                totalDecks: 0,
                dueCards: 0,
                reviewedToday: 0
            };
        }
    }
    
    // Data management
    async exportData() {
        try {
            const cards = await this.getAllCards();
            const decks = await this.getAllDecks();
            
            return {
                cards,
                decks,
                exportDate: new Date(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }
    
    async importData(data) {
        try {
            // Clear existing data
            await this.db.cards.clear();
            await this.db.decks.clear();
            
            // Import decks first
            if (data.decks && data.decks.length > 0) {
                await this.db.decks.bulkAdd(data.decks);
            }
            
            // Import cards
            if (data.cards && data.cards.length > 0) {
                await this.db.cards.bulkAdd(data.cards);
            }
            
            console.log('Data imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }
    
    async clearAllData() {
        try {
            await this.db.cards.clear();
            await this.db.decks.clear();
            console.log('All data cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            throw error;
        }
    }
}

// Make DatabaseService available globally
window.DatabaseService = DatabaseService;
