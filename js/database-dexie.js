// Mimir Database - Dexie Implementation
// Replaces the custom IndexedDB implementation with Dexie for better maintainability

// Database configuration
const DB_CONFIG = {
    name: 'mimirDB',
    isDevelopment: false, // Set to false to persist cards between page loads
    version: 3
};

// Development mode: Auto-reset database on page load
if (DB_CONFIG.isDevelopment) {
    console.log("Dev mode: Auto-resetting database on page load");
    window.indexedDB.deleteDatabase(DB_CONFIG.name);
}

// Initialize Dexie database
const db = new Dexie(DB_CONFIG.name);

// Define schema
db.version(DB_CONFIG.version).stores({
    cards: '&card_id, prompt, response, *tags, due_date, review_interval, created_at, updated_at, last_reviewed, review_count'
});

// Database operations class
class MimirDatabase {
    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    static async init() {
        try {
            await db.open();
            console.log('Dexie database initialized successfully');
            return db;
        } catch (error) {
            console.error('Failed to initialize Dexie database:', error);
            throw error;
        }
    }

    /**
     * Get all cards from the database
     * @returns {Promise<Array>} Array of all cards
     */
    static async getAllCards() {
        try {
            const cards = await db.cards.toArray();
            
            // Ensure backward compatibility - migrate cards without scheduling fields
            const migratedCards = [];
            let needsMigration = false;

            for (const card of cards) {
                let updatedCard = {
                    ...card,
                    tags: card.tags || []
                };

                // Migrate cards that don't have scheduling fields
                if (!card.due_date || !card.hasOwnProperty('review_interval')) {
                    updatedCard = SpacedRepetitionScheduler.initializeCard(updatedCard);
                    needsMigration = true;
                    console.log('Migrated card to include scheduling fields:', updatedCard.card_id);
                }

                migratedCards.push(updatedCard);
            }

            // Save migrated cards back to database if needed
            if (needsMigration) {
                await db.cards.bulkPut(migratedCards);
            }

            return migratedCards;
        } catch (error) {
            console.error('Failed to get all cards:', error);
            throw error;
        }
    }

    /**
     * Save a new card to the database
     * @param {Object} card - The card object to save
     * @returns {Promise<string>} The card ID
     */
    static async saveCard(card) {
        try {
            console.log('Starting database save for card:', card.card_id);
            await db.cards.add(card);
            console.log('Card successfully saved to database:', card.card_id);
            return card.card_id;
        } catch (error) {
            console.error('Failed to save card:', card.card_id, error);
            throw error;
        }
    }

    /**
     * Update an existing card in the database
     * @param {Object} card - The card object to update
     * @returns {Promise<string>} The card ID
     */
    static async updateCard(card) {
        try {
            await db.cards.put(card);
            console.log('Card successfully updated in database:', card.card_id);
            return card.card_id;
        } catch (error) {
            console.error('Failed to update card:', card.card_id, error);
            throw error;
        }
    }

    /**
     * Delete a card from the database
     * @param {string} cardId - The ID of the card to delete
     * @returns {Promise<void>}
     */
    static async deleteCard(cardId) {
        try {
            await db.cards.delete(cardId);
            console.log('Card successfully deleted from database:', cardId);
        } catch (error) {
            console.error('Failed to delete card:', cardId, error);
            throw error;
        }
    }

    /**
     * Get cards that are due for review
     * @param {Date} checkDate - The date to check against (defaults to now)
     * @returns {Promise<Array>} Array of cards due for review
     */
    static async getDueCards(checkDate = new Date()) {
        try {
            const today = new Date(checkDate);
            today.setUTCHours(23, 59, 59, 999); // End of day in UTC
            
            const dueCards = await db.cards
                .where('due_date')
                .belowOrEqual(today.toISOString())
                .toArray();
            
            return dueCards;
        } catch (error) {
            console.error('Failed to get due cards:', error);
            throw error;
        }
    }

    /**
     * Get cards by tag(s)
     * @param {string|Array} tags - Single tag or array of tags to filter by
     * @returns {Promise<Array>} Array of cards with matching tags
     */
    static async getCardsByTags(tags) {
        try {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            const cards = await db.cards
                .where('tags')
                .anyOf(tagArray)
                .toArray();
            
            return cards;
        } catch (error) {
            console.error('Failed to get cards by tags:', error);
            throw error;
        }
    }

    /**
     * Get all unique tags from all cards
     * @returns {Promise<Array>} Array of unique tags
     */
    static async getAllTags() {
        try {
            const cards = await db.cards.toArray();
            const allTags = cards.reduce((tags, card) => {
                if (card.tags && Array.isArray(card.tags)) {
                    tags.push(...card.tags);
                }
                return tags;
            }, []);
            
            // Return unique tags
            return [...new Set(allTags)];
        } catch (error) {
            console.error('Failed to get all tags:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    static async getStats() {
        try {
            const totalCards = await db.cards.count();
            const dueCards = await this.getDueCards();
            const allTags = await this.getAllTags();
            
            return {
                totalCards,
                dueCards: dueCards.length,
                totalTags: allTags.length,
                tags: allTags
            };
        } catch (error) {
            console.error('Failed to get database stats:', error);
            throw error;
        }
    }

    /**
     * Clear all data from the database (for development/testing)
     * @returns {Promise<void>}
     */
    static async clearAll() {
        try {
            await db.cards.clear();
            console.log('All cards cleared from database');
        } catch (error) {
            console.error('Failed to clear database:', error);
            throw error;
        }
    }

    /**
     * Close the database connection
     * @returns {Promise<void>}
     */
    static async close() {
        try {
            await db.close();
            console.log('Database connection closed');
        } catch (error) {
            console.error('Failed to close database:', error);
            throw error;
        }
    }
}

// Export the database instance and operations for global access
window.MimirDB = MimirDatabase;
window.mimirDb = db;

// Auto-initialize the database when the script loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await MimirDatabase.init();
    } catch (error) {
        console.error('Failed to auto-initialize database:', error);
    }
});

console.log('Mimir Database (Dexie) module loaded');
