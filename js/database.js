// Database configuration
const DB_CONFIG = {
    name: 'mimirDB',
    version: 1,
    stores: {
        cards: {
            keyPath: 'card_id',
            indexes: [
                { name: 'prompt', unique: false },
                { name: 'response', unique: false }
            ]
        }
    }
};

// Alpine.js component for the main app
function mimirApp() {
    console.log('mimirApp function called');
    const appData = {
        dbExists: false,
        dbStatus: 'Checking database status...',
        showActions: false,
        isLoading: false,

        checkDatabase() {
            const request = indexedDB.open(DB_CONFIG.name);

            request.onerror = () => {
                this.dbStatus = 'Unable to access database.';
                this.showNoDatabaseUI();
            };

            request.onsuccess = (event) => {
                const db = event.target.result;

                // Check if our object store exists
                if (!db.objectStoreNames.contains('cards')) {
                    this.dbStatus = 'Database exists but needs setup.';
                    this.showNoDatabaseUI();
                } else {
                    this.dbStatus = 'Database ready!';
                    this.showDatabaseExistsUI();
                }
                db.close();
            };

            request.onupgradeneeded = (event) => {
                this.dbStatus = 'No database found. Click "Get Started" to create one.';
                event.target.transaction.abort(); // Don't create DB yet
                this.showNoDatabaseUI();
            };
        },

        showNoDatabaseUI() {
            console.log('showNoDatabaseUI called');
            this.showActions = true;
            this.dbExists = false;
            console.log('State after showNoDatabaseUI:', { showActions: this.showActions, dbExists: this.dbExists });
        },

        showDatabaseExistsUI() {
            this.showActions = true;
            this.dbExists = true;
        },

        initializeDatabase() {
            this.isLoading = true;
            this.dbStatus = 'Creating database...';

            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

            request.onerror = () => {
                console.error("Database error:", request.error);
                this.isLoading = false;
                this.dbStatus = 'Failed to create database. Please try again.';
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store for cards
                const cardsStore = db.createObjectStore('cards', { keyPath: 'card_id' });

                // Add indexes based on our data model
                DB_CONFIG.stores.cards.indexes.forEach(index => {
                    cardsStore.createIndex(index.name, index.name, { unique: index.unique });
                });
            };

            request.onsuccess = () => {
                this.isLoading = false;
                this.dbStatus = 'Database created successfully!';
                this.showDatabaseExistsUI();
            };
        },

        resetDatabase() {
            if (confirm('Are you sure you want to reset the database? All cards will be permanently deleted.')) {
                this.isLoading = true;
                this.dbStatus = 'Resetting database...';

                const request = indexedDB.deleteDatabase(DB_CONFIG.name);

                request.onerror = () => {
                    console.error("Error deleting database:", request.error);
                    this.isLoading = false;
                    this.dbStatus = 'Failed to reset database. Please try again.';
                };

                request.onsuccess = () => {
                    console.log("Database deleted successfully");
                    this.isLoading = false;
                    this.dbStatus = 'Database has been reset successfully. Click "Get Started" to create a new one.';
                    this.showNoDatabaseUI();
                };
            }
        }
    };

    console.log('Returning appData:', appData);
    return appData;
}

/**
 * Add a card to the database
 * @param {Object} card - The card object to add
 * @returns {Promise} - Resolves with the card ID on success
 */
function addCard(card) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['cards'], 'readwrite');
            const store = transaction.objectStore('cards');

            // Generate a unique ID if not provided
            if (!card.card_id) {
                card.card_id = generateUID();
            }

            const addRequest = store.add(card);

            addRequest.onsuccess = () => resolve(card.card_id);
            addRequest.onerror = () => reject(addRequest.error);

            transaction.oncomplete = () => db.close();
        };
    });
}

/**
 * Generate a unique ID for cards
 * @returns {string} - A unique ID
 */
function generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Test that the function is defined
console.log('mimirApp function defined:', typeof mimirApp);
window.mimirApp = mimirApp; // Make it globally available for debugging