document.addEventListener('DOMContentLoaded', () => {
    loadCards();
});

/**
 * Load all cards from the database and display them
 */
function loadCards() {
    const cardList = document.getElementById('card-list');
    cardList.innerHTML = '<li>Loading cards...</li>';
    
    getAllCards()
        .then(cards => {
            if (cards.length === 0) {
                cardList.innerHTML = '<li>No cards found. <a href="card_create.html">Create some cards</a> to get started.</li>';
                return;
            }
            
            cardList.innerHTML = '';
            cards.forEach(card => {
                const li = document.createElement('li');
                li.className = 'card-item';
                li.innerHTML = `
                    <div><strong>Prompt:</strong> ${card.prompt}</div>
                    <div><strong>Response:</strong> ${card.response}</div>
                `;
                cardList.appendChild(li);
            });
        })
        .catch(error => {
            cardList.innerHTML = `<li>Error loading cards: ${error.message}</li>`;
            console.error('Error loading cards:', error);
        });
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