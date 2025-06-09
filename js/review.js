document.addEventListener('DOMContentLoaded', () => {
    loadFirstCard();
    setupSwipeHandlers();
});

let currentCardIndex = 0;
let allCards = [];

/**
 * Load the first card from the database
 */
function loadFirstCard() {
    const cardContainer = document.getElementById('current-card');
    cardContainer.innerHTML = '<div>Loading card...</div>';
    
    getAllCards()
        .then(cards => {
            allCards = cards;
            if (cards.length === 0) {
                cardContainer.innerHTML = '<div>No cards found. <a href="card_create.html">Create some cards</a> to get started.</div>';
                return;
            }
            displayCard(0);
        })
        .catch(error => {
            cardContainer.innerHTML = `<div>Error loading cards: ${error.message}</div>`;
            console.error('Error loading cards:', error);
        });
}

/**
 * Display a card at the specified index
 */
function displayCard(index) {
    if (index >= allCards.length || index < 0) {
        return false;
    }
    
    currentCardIndex = index;
    const card = allCards[index];
    const cardContainer = document.getElementById('current-card');
    
    cardContainer.innerHTML = `
        <div class="card" id="swipeable-card">
            <div class="card-front"><strong>${card.prompt}</strong></div>
            <div class="card-back hidden">${card.response}</div>
            <button id="flip-btn">Flip Card</button>
        </div>
    `;
    
    document.getElementById('flip-btn').addEventListener('click', flipCard);
    return true;
}

/**
 * Flip the card to show answer
 */
function flipCard() {
    const cardFront = document.querySelector('.card-front');
    const cardBack = document.querySelector('.card-back');
    
    cardFront.classList.toggle('hidden');
    cardBack.classList.toggle('hidden');
}

/**
 * Setup touch and mouse handlers for swiping
 */
function setupSwipeHandlers() {
    let startX, startY;
    const threshold = 100; // Minimum distance for a swipe
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, false);
    
    document.addEventListener('touchend', (e) => {
        if (!startX || !startY) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Horizontal swipe detection
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe left
                nextCard();
            } else {
                // Swipe right
                nextCard();
            }
        }
        
        startX = null;
        startY = null;
    }, false);
}

/**
 * Go to the next card
 */
function nextCard() {
    if (!displayCard(currentCardIndex + 1)) {
        // If we've reached the end, go back to the first card
        displayCard(0);
    }
}

/**
 * Get all cards from the database
 * @returns {Promise} - Resolves with an array of card objects
 */
function getAllCards() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['cards'], 'readonly');
            const store = transaction.objectStore('cards');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
            
            transaction.oncomplete = () => db.close();
        };
    });
}