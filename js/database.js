// Database configuration
const DB_CONFIG = {
    name: 'mimirDB',
    isDevelopment: false, // Set to false to persist cards between page loads
    version: 3, // Incremented for schema changes - added due_date and review_interval
    stores: {
        cards: {
            keyPath: 'card_id',
            indexes: [
                { name: 'prompt', unique: false },
                { name: 'response', unique: false },
                { name: 'tags', unique: false },
                { name: 'due_date', unique: false },
                { name: 'review_interval', unique: false }
            ]
        }
    }
};

// At the top of your database.js file
if (DB_CONFIG.isDevelopment) {
    console.log("Dev mode: Auto-resetting database on page load");
    window.indexedDB.deleteDatabase(DB_CONFIG.name);
}
