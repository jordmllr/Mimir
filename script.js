// Mimir v1 - Basic Review Functionality
console.log('Mimir v1 starting...');

// Import our tested modules
import { MimirDatabase } from './src/database.js';
import { ReviewScheduler } from './src/reviewScheduler.js';
import { ReviewSession } from './src/reviewSession.js';

// Test that Dexie loaded
if (typeof Dexie !== 'undefined') {
    console.log('Dexie loaded successfully');
} else {
    console.error('Dexie failed to load');
    alert('Error: Dexie library failed to load. Please refresh the page.');
}

// Initialize our tested database module
const database = new MimirDatabase();
const db = database.db; // For backward compatibility with existing code

// Application state
let currentDeckId = null;
let currentCardId = null;
let currentReviewSession = null;

// UI-specific ReviewSession wrapper that extends our tested ReviewSession class
class UIReviewSession extends ReviewSession {
  constructor() {
    super(db);
  }

  async start(deckId, mode) {
    const success = await super.start(deckId, mode);

    if (!success) {
      const message = mode === 'blitz'
        ? 'No cards in this deck!'
        : `No cards ${mode === 'retaining' ? 'due for retention' : 'available for'} review!`;
      alert(message);
      return false;
    }

    currentReviewSession = this;
    await this.displayCurrentCard();
    showView('review-session-view');
    return true;
  }

  async displayCurrentCard() {
    if (this.isSessionComplete()) {
      await this.endSession();
      return;
    }

    let card = this.getCurrentCard();
    if (!card) {
      // For blitz/learning mode, if we've run out of cards but not all are mastered,
      // we need to continue with remaining unmastered cards
      if (this.mode === 'blitz' || this.mode === 'learning') {
        const sessionComplete = await this.handleContinuousMode();
        if (sessionComplete) {
          await this.endSession();
          return;
        }
        // Get the new current card after filtering
        card = this.getCurrentCard();
        if (!card) {
          await this.endSession();
          return;
        }
      } else {
        await this.endSession();
        return;
      }
    }

    document.getElementById('review-prompt-text').textContent = card.prompt;
    document.getElementById('review-response-text').textContent = card.response;
    document.getElementById('review-response').classList.remove('revealed');
    document.getElementById('show-answer-btn').style.display = 'block';
    document.getElementById('review-buttons').style.display = 'none';
    this.showingAnswer = false;

    // Add click handler to the card to reveal answer
    const reviewCard = document.querySelector('.review-card');
    if (reviewCard) {
      reviewCard.onclick = () => {
        if (!this.showingAnswer) {
          this.showAnswer();
        }
      };
      reviewCard.style.cursor = this.showingAnswer ? 'default' : 'pointer';
    }

    // Update progress display
    const progress = document.getElementById('review-progress');
    if (this.mode === 'blitz' || this.mode === 'learning') {
      const stats = this.getSessionStats();
      progress.textContent = `Mastered: ${stats.completed}/${stats.total} | Current: ${this.currentIndex + 1}/${this.cards.length}`;
    } else {
      progress.textContent = `Card ${this.currentIndex + 1} of ${this.cards.length}`;
    }
  }

  showAnswer() {
    const responseElement = document.getElementById('review-response');
    responseElement.classList.add('revealed');

    document.getElementById('show-answer-btn').style.display = 'none';
    document.getElementById('review-buttons').style.display = 'block';
    this.showingAnswer = true;

    // Update cursor style
    const reviewCard = document.querySelector('.review-card');
    if (reviewCard) {
      reviewCard.style.cursor = 'default';
    }
  }

  async handleContinuousMode() {
    // Use the parent class method
    return await super.handleContinuousMode();
  }

  async answerCard(isCorrect) {
    if (!this.showingAnswer) return;

    // Use the parent class's answerCard method which handles all the logic
    await super.answerCard(isCorrect);

    // Update the UI
    await this.displayCurrentCard();
  }

  async endSession() {
    let message;
    if (this.mode === 'blitz' || this.mode === 'learning') {
      const stats = this.getSessionStats();
      if (stats.completed === stats.total) {
        message = `${this.mode === 'blitz' ? 'Blitz' : 'Learning'} session complete! All ${stats.total} cards mastered.`;
      } else {
        message = `${this.mode === 'blitz' ? 'Blitz' : 'Learning'} session ended. Mastered ${stats.completed} of ${stats.total} cards.`;
      }
    } else {
      message = 'Review session complete!';
    }
    alert(message);
    currentReviewSession = null;

    // Refresh the card view to show updated review info
    await loadCards();
    showView('card-view');
  }

  async exitSession() {
    if (confirm('Are you sure you want to exit this review session?')) {
      await this.endSession();
    }
  }
}

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
    const decks = await database.getAllDecks();
    const sortedDecks = decks.sort((a, b) => a.name.localeCompare(b.name));
    const deckList = document.getElementById('deck-list');

    if (sortedDecks.length === 0) {
      deckList.innerHTML = '<p class="empty-state">No decks yet. Create your first deck!</p>';
      return;
    }

    deckList.innerHTML = sortedDecks.map(deck => `
      <div class="deck-item ${currentDeckId === deck.id ? 'active' : ''}" onclick="selectDeck(${deck.id})">
        <div class="deck-header-row">
          <h3>${deck.name}</h3>
          <button onclick="event.stopPropagation(); deleteDeck(${deck.id})" class="delete-icon-btn" title="Delete deck">
            <svg width="16" height="16" viewBox="0 0 109.484 122.88">
              <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M2.347,9.633h38.297V3.76c0-2.068,1.689-3.76,3.76-3.76h21.144 c2.07,0,3.76,1.691,3.76,3.76v5.874h37.83c1.293,0,2.347,1.057,2.347,2.349v11.514H0V11.982C0,10.69,1.055,9.633,2.347,9.633 L2.347,9.633z M8.69,29.605h92.921c1.937,0,3.696,1.599,3.521,3.524l-7.864,86.229c-0.174,1.926-1.59,3.521-3.523,3.521h-77.3 c-1.934,0-3.352-1.592-3.524-3.521L5.166,33.129C4.994,31.197,6.751,29.605,8.69,29.605L8.69,29.605z M69.077,42.998h9.866v65.314 h-9.866V42.998L69.077,42.998z M30.072,42.998h9.867v65.314h-9.867V42.998L30.072,42.998z M49.572,42.998h9.869v65.314h-9.869 V42.998L49.572,42.998z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading decks:', error);
  }
}

async function createDeck(name, description) {
  try {
    await database.createDeck(name, description);
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
    await database.deleteDeck(deckId);
    console.log('Deck deleted successfully');
    await loadDecks();
  } catch (error) {
    console.error('Error deleting deck:', error);
  }
}

async function selectDeck(deckId) {
  currentDeckId = deckId;
  try {
    const deck = await database.getDeck(deckId);
    document.getElementById('current-deck-name').textContent = deck.name;
    await loadCards();
    await loadDecks(); // Refresh to update active state
    showView('card-view');
  } catch (error) {
    console.error('Error selecting deck:', error);
  }
}

// Card CRUD Operations
async function loadCards() {
  if (!currentDeckId) return;

  // Load and display due card counts and review options as tiles
  try {
    const dueCounts = await ReviewScheduler.getDueCounts(db, currentDeckId);
    const allCards = await database.getCardsByDeck(currentDeckId);
    const reviewTiles = document.getElementById('review-tiles');

    reviewTiles.innerHTML = `
      <div class="review-tile learning ${dueCounts.learning === 0 ? 'disabled' : ''}"
           onclick="${dueCounts.learning > 0 ? 'startReview(\'learning\')' : ''}">
        <h4>Learning Mode</h4>
        <p>${dueCounts.learning} cards due</p>
      </div>
      <div class="review-tile retention ${dueCounts.retaining === 0 ? 'disabled' : ''}"
           onclick="${dueCounts.retaining > 0 ? 'startReview(\'retaining\')' : ''}">
        <h4>Retention Mode</h4>
        <p>${dueCounts.retaining} cards due</p>
      </div>
      <div class="review-tile blitz ${allCards.length === 0 ? 'disabled' : ''}"
           onclick="${allCards.length > 0 ? 'startReview(\'blitz\')' : ''}">
        <h4>Blitz Mode</h4>
        <p>${allCards.length} total cards</p>
      </div>
    `;
  } catch (error) {
    console.error('Error loading review info:', error);
  }

  try {
    const cards = await database.getCardsByDeck(currentDeckId);
    const cardList = document.getElementById('card-list');

    if (cards.length === 0) {
      cardList.innerHTML = '<p class="empty-state">No cards yet. Add your first card!</p>';
      return;
    }

    cardList.innerHTML = cards.map(card => {
      const dueDate = new Date(card.due_date);
      const dueStatus = dueDate <= new Date() ? 'Due now' : `Due: ${dueDate.toLocaleDateString()}`;
      const modeDisplay = card.mode || 'learning';

      return `
        <div class="card-item">
          <h4>${card.prompt}</h4>
          <p><strong>Response:</strong> ${card.response}</p>
          <p><small>Created: ${card.created_at.toLocaleDateString()} | Mode: ${modeDisplay} | ${dueStatus}</small></p>
          <div class="card-actions">
            <button onclick="editCard(${card.id})">Edit</button>
            <button onclick="deleteCard(${card.id})" class="delete-btn">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading cards:', error);
  }
}

async function createCard(prompt, response) {
  if (!currentDeckId) return;

  try {
    await database.createCard(currentDeckId, prompt, response);
    console.log('Card created successfully');
    await loadCards();
    showView('card-view');
  } catch (error) {
    console.error('Error creating card:', error);
  }
}

async function updateCard(cardId, prompt, response) {
  try {
    await database.updateCard(cardId, {
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
    await database.deleteCard(cardId);
    console.log('Card deleted successfully');
    await loadCards();
  } catch (error) {
    console.error('Error deleting card:', error);
  }
}

async function editCard(cardId) {
  try {
    const card = await database.getCard(cardId);
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
    await database.db.open();
    console.log('Database opened successfully');
    await loadDecks();
    showView('deck-view'); // Show deck selection by default
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

  // Note: back-to-decks button removed in new layout - deck switching handled by sidebar

  // App initialization complete
  console.log('App initialization complete');
});

// Review Functions (called from HTML)
async function startReview(mode) {
  if (!currentDeckId) {
    console.error('No deck selected for review');
    return;
  }

  try {
    console.log(`Starting ${mode} review for deck ${currentDeckId}`);
    const session = new UIReviewSession();
    const success = await session.start(currentDeckId, mode);
    if (!success) {
      // No cards available, stay on current view
      console.log(`No cards available for ${mode} review`);
      return;
    }
  } catch (error) {
    console.error('Error starting review:', error);
    alert('Error starting review: ' + error.message);
  }
}

function showAnswer() {
  if (currentReviewSession) {
    currentReviewSession.showAnswer();
  }
}

async function answerCorrect() {
  if (currentReviewSession) {
    await currentReviewSession.answerCard(true);
  }
}

async function answerIncorrect() {
  if (currentReviewSession) {
    await currentReviewSession.answerCard(false);
  }
}

async function exitSession() {
  if (currentReviewSession) {
    await currentReviewSession.exitSession();
  }
}

// Make functions globally accessible for HTML onclick handlers
window.selectDeck = selectDeck;
window.deleteDeck = deleteDeck;
window.editCard = editCard;
window.deleteCard = deleteCard;
window.startReview = startReview;
window.showAnswer = showAnswer;
window.answerCorrect = answerCorrect;
window.answerIncorrect = answerIncorrect;
window.exitSession = exitSession;
