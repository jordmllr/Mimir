// Mimir v1 - Basic CRUD Operations
console.log('Mimir v1 starting...');

// Test that Dexie loaded
if (typeof Dexie !== 'undefined') {
    console.log('Dexie loaded successfully');
} else {
    console.error('Dexie failed to load');
    alert('Error: Dexie library failed to load. Please refresh the page.');
}

// Database setup with Dexie
const db = new Dexie('MimirDB');

// Define schema
db.version(1).stores({
  decks: '++id, name, description, created_at, updated_at',
  cards: '++id, deck_id, prompt, response, created_at, updated_at'
});

// Database hooks for timestamps
db.decks.hook('creating', function (primKey, obj, trans) {
  obj.created_at = new Date();
  obj.updated_at = new Date();
});

db.decks.hook('updating', function (modifications, primKey, obj, trans) {
  modifications.updated_at = new Date();
});

db.cards.hook('creating', function (primKey, obj, trans) {
  obj.created_at = new Date();
  obj.updated_at = new Date();
});

db.cards.hook('updating', function (modifications, primKey, obj, trans) {
  modifications.updated_at = new Date();
});

// Application state
let currentDeckId = null;
let currentCardId = null;

// View management
function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

// Deck CRUD Operations
async function loadDecks() {
  try {
    const decks = await db.decks.orderBy('name').toArray();
    const deckList = document.getElementById('deck-list');
    
    if (decks.length === 0) {
      deckList.innerHTML = '<p>No decks yet. Create your first deck!</p>';
      return;
    }
    
    deckList.innerHTML = decks.map(deck => `
      <div class="deck-item">
        <h3>${deck.name}</h3>
        <p>${deck.description || 'No description'}</p>
        <p><small>Created: ${deck.created_at.toLocaleDateString()}</small></p>
        <div class="deck-actions">
          <button onclick="selectDeck(${deck.id})">View Cards</button>
          <button onclick="deleteDeck(${deck.id})" class="delete-btn">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading decks:', error);
  }
}

async function createDeck(name, description) {
  try {
    await db.decks.add({
      name: name,
      description: description
    });
    console.log('Deck created successfully');
    await loadDecks();
    showView('deck-view');
  } catch (error) {
    console.error('Error creating deck:', error);
  }
}

async function deleteDeck(deckId) {
  if (!confirm('Are you sure? This will delete the deck and all its cards.')) {
    return;
  }
  
  try {
    // Delete all cards in the deck first
    await db.cards.where('deck_id').equals(deckId).delete();
    // Then delete the deck
    await db.decks.delete(deckId);
    console.log('Deck deleted successfully');
    await loadDecks();
  } catch (error) {
    console.error('Error deleting deck:', error);
  }
}

async function selectDeck(deckId) {
  currentDeckId = deckId;
  try {
    const deck = await db.decks.get(deckId);
    document.getElementById('current-deck-name').textContent = deck.name;
    await loadCards();
    showView('card-view');
  } catch (error) {
    console.error('Error selecting deck:', error);
  }
}

// Card CRUD Operations
async function loadCards() {
  if (!currentDeckId) return;
  
  try {
    const cards = await db.cards.where('deck_id').equals(currentDeckId).toArray();
    const cardList = document.getElementById('card-list');
    
    if (cards.length === 0) {
      cardList.innerHTML = '<p>No cards yet. Add your first card!</p>';
      return;
    }
    
    cardList.innerHTML = cards.map(card => `
      <div class="card-item">
        <h4>Prompt: ${card.prompt}</h4>
        <p><strong>Response:</strong> ${card.response}</p>
        <p><small>Created: ${card.created_at.toLocaleDateString()}</small></p>
        <div class="card-actions">
          <button onclick="editCard(${card.id})">Edit</button>
          <button onclick="deleteCard(${card.id})" class="delete-btn">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading cards:', error);
  }
}

async function createCard(prompt, response) {
  if (!currentDeckId) return;
  
  try {
    await db.cards.add({
      deck_id: currentDeckId,
      prompt: prompt,
      response: response
    });
    console.log('Card created successfully');
    await loadCards();
    showView('card-view');
  } catch (error) {
    console.error('Error creating card:', error);
  }
}

async function updateCard(cardId, prompt, response) {
  try {
    await db.cards.update(cardId, {
      prompt: prompt,
      response: response
    });
    console.log('Card updated successfully');
    await loadCards();
    showView('card-view');
  } catch (error) {
    console.error('Error updating card:', error);
  }
}

async function deleteCard(cardId) {
  if (!confirm('Are you sure you want to delete this card?')) {
    return;
  }
  
  try {
    await db.cards.delete(cardId);
    console.log('Card deleted successfully');
    await loadCards();
  } catch (error) {
    console.error('Error deleting card:', error);
  }
}

async function editCard(cardId) {
  try {
    const card = await db.cards.get(cardId);
    currentCardId = cardId;

    document.getElementById('card-prompt').value = card.prompt;
    document.getElementById('card-response').value = card.response;
    document.getElementById('card-form-title').textContent = 'Edit Card';
    document.getElementById('card-submit').textContent = 'Update Card';

    showView('card-form-view');
  } catch (error) {
    console.error('Error loading card for edit:', error);
  }
}

// Event listeners and app initialization
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM loaded, initializing app...');

  // Initialize database
  try {
    await db.open();
    console.log('Database opened successfully');
    await loadDecks();
  } catch (error) {
    console.error('Database error:', error);
    alert('Database error: ' + error.message);
    return;
  }

  // Deck form handling
  document.getElementById('new-deck-btn').addEventListener('click', () => {
    showView('deck-form-view');
  });

  document.getElementById('deck-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('deck-name').value.trim();
    const description = document.getElementById('deck-description').value.trim();

    if (name) {
      await createDeck(name, description);
      document.getElementById('deck-form').reset();
    }
  });

  document.getElementById('cancel-deck').addEventListener('click', () => {
    document.getElementById('deck-form').reset();
    showView('deck-view');
  });

  // Card form handling
  document.getElementById('new-card-btn').addEventListener('click', () => {
    currentCardId = null;
    document.getElementById('card-form-title').textContent = 'Add New Card';
    document.getElementById('card-submit').textContent = 'Add Card';
    document.getElementById('card-form').reset();
    showView('card-form-view');
  });

  document.getElementById('card-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = document.getElementById('card-prompt').value.trim();
    const response = document.getElementById('card-response').value.trim();

    if (prompt && response) {
      if (currentCardId) {
        await updateCard(currentCardId, prompt, response);
      } else {
        await createCard(prompt, response);
      }
      document.getElementById('card-form').reset();
      currentCardId = null;
    }
  });

  document.getElementById('cancel-card').addEventListener('click', () => {
    document.getElementById('card-form').reset();
    currentCardId = null;
    showView('card-view');
  });

  document.getElementById('back-to-decks').addEventListener('click', () => {
    currentDeckId = null;
    showView('deck-view');
  });

  // App initialization complete
  console.log('App initialization complete');
});
