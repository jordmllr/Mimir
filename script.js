// Mimir v1 - Cards and Decks
console.log('Mimir v1 starting...');

// Test that Dexie loaded
if (typeof Dexie !== 'undefined') {
    console.log('Dexie loaded successfully');
    document.getElementById('status').textContent = 'App loaded successfully! Dexie ready.';
} else {
    console.error('Dexie failed to load');
    document.getElementById('status').textContent = 'Error: Dexie library not loaded';
    document.getElementById('status').style.color = '#dc3545';
}

// Basic app initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, app ready');
});