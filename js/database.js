// Database configuration
const DB_CONFIG = {
    name: 'mimirDB',
    isDevelopment: true,
    version: 2, // Incremented for schema changes
    stores: {
        cards: {
            keyPath: 'card_id',
            indexes: [
                { name: 'prompt', unique: false },
                { name: 'response', unique: false },
                { name: 'tags', unique: false }
            ]
        }
    }
};

// At the top of your database.js file
if (DB_CONFIG.isDevelopment) {
    console.log("Dev mode: Auto-resetting database on page load");
    window.indexedDB.deleteDatabase(DB_CONFIG.name);
}
