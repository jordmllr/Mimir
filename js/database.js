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

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkDatabase();

    document.getElementById('create-db-btn').addEventListener('click', initializeDatabase);
    document.getElementById('reset-db-btn').addEventListener('click', resetDatabase);
});

/**
 * Check if the database exists and has the required structure
 */
function checkDatabase() {
    const request = indexedDB.open(DB_CONFIG.name);
    const statusEl = document.getElementById('db-status');
    const actionContainer = document.getElementById('db-action-container');
    const createDatabaseBtn = document.getElementById('create-db-btn');
    const resetDatabaseBtn = document.getElementById('reset-db-btn');
    const navigationEl = document.querySelector('navigation');

    request.onerror = () => {
        statusEl.textContent = 'Unable to access database.';
        showNoDatabaseUI();
    };

    request.onsuccess = (event) => {
        const db = event.target.result;

        // Check if our object store exists
        if (!db.objectStoreNames.contains('cards')) {
            statusEl.textContent = 'Database exists but needs setup.';
            showNoDatabaseUI();
        } else {
            statusEl.textContent = 'Database ready!';
            showDatabaseExistsUI();
        }
        db.close();
    };

    request.onupgradeneeded = (event) => {
        statusEl.textContent = 'No database found. Click "Get Started" to create one.';
        event.target.transaction.abort(); // Don't create DB yet
        showNoDatabaseUI();
    };

    function showNoDatabaseUI() {
        actionContainer.classList.remove('hidden');
        createDatabaseBtn.classList.remove('hidden');
        resetDatabaseBtn.hidden = true;
        navigationEl.hidden = true;
    }

    function showDatabaseExistsUI() {
        actionContainer.classList.remove('hidden');
        createDatabaseBtn.classList.add('hidden');
        resetDatabaseBtn.hidden = false;
        navigationEl.hidden = false;
    }
}

/**
 * Initialize the database with the required object stores
 */
function initializeDatabase() {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = () => {
        console.error("Database error:", request.error);
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
        const statusEl = document.getElementById('db-status');
        const createDatabaseBtn = document.getElementById('create-db-btn');
        const resetDatabaseBtn = document.getElementById('reset-db-btn');
        const navigationEl = document.querySelector('navigation');

        statusEl.textContent = 'Database created successfully!';
        createDatabaseBtn.classList.add('hidden');
        resetDatabaseBtn.hidden = false;
        navigationEl.hidden = false;
    };
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
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Delete the database completely
 */
function resetDatabase() {
    if (confirm('Are you sure you want to reset the database? All cards will be permanently deleted.')) {
        const statusEl = document.getElementById('db-status');
        const createBtn = document.getElementById('create-db-btn');

        const request = indexedDB.deleteDatabase(DB_CONFIG.name);

        request.onerror = () => {
            console.error("Error deleting database:", request.error);
            statusEl.textContent = 'Failed to reset database. Please try again.';
        };

        request.onsuccess = () => {
            console.log("Database deleted successfully");
            const resetDatabaseBtn = document.getElementById('reset-db-btn');
            const navigationEl = document.querySelector('navigation');

            statusEl.textContent = 'Database has been reset successfully. Click "Get Started" to create a new one.';
            createBtn.classList.remove('hidden');
            resetDatabaseBtn.hidden = true;
            navigationEl.hidden = true;
        };
    }
}

