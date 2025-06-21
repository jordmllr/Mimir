// Mimir v1 - Basic Review Functionality
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

// Define schema - Version 2 adds review functionality
db.version(1).stores({
  decks: '++id, name, description, created_at, updated_at',
  cards: '++id, deck_id, prompt, response, created_at, updated_at'
});

// Version 2: Add review fields to cards
db.version(2).stores({
  decks: '++id, name, description, created_at, updated_at',
  cards: '++id, deck_id, prompt, response, mode, due_date, review_history, created_at, updated_at'
}).upgrade(tx => {
  // Migrate existing cards to have default review values
  return tx.cards.toCollection().modify(card => {
    card.mode = 'learning';
    card.due_date = new Date(); // Due immediately for review
    card.review_history = [];
  });
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
let currentReviewSession = null;

// Review Scheduling Functions
const ReviewScheduler = {
  // Graduate card from learning to retention mode
  graduateCard(card) {
    card.mode = 'retaining';
    card.due_date = new Date(Date.now() + (24 * 60 * 60 * 1000)); // Due in 1 day
    // Don't add to review_history - learning attempts don't count
    return card;
  },

  // Retention mode: 2^n days where n = number of correct reviews
  scheduleRetainCard(card, isCorrect) {
    const now = new Date();
    const reviewEntry = {
      timestamp: now,
      correct: isCorrect
    };

    if (!card.review_history) card.review_history = [];
    card.review_history.push(reviewEntry);

    if (isCorrect) {
      // Count total correct reviews for this card
      const correctCount = card.review_history.filter(entry => entry.correct).length;
      const daysToAdd = Math.pow(2, correctCount - 1); // 2^(n-1) where n is correct count
      card.due_date = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    } else {
      // Incorrect - schedule for immediate review but stay in retention mode
      card.due_date = now;
    }

    return card;
  },

  // Get cards due for review
  async getDueCards(deckId, mode = null) {
    const now = new Date();
    let query = db.cards.where('deck_id').equals(deckId).and(card => new Date(card.due_date) <= now);

    if (mode) {
      query = query.and(card => card.mode === mode);
    }

    return await query.toArray();
  },

  // Get count of due cards by mode
  async getDueCounts(deckId) {
    const now = new Date();

    // Learning cards are always "due" (no scheduling)
    const learningCards = await db.cards.where('deck_id').equals(deckId).and(card => card.mode === 'learning').toArray();

    // Retention cards are due based on their due_date
    const retentionDue = await db.cards.where('deck_id').equals(deckId)
      .and(card => card.mode === 'retaining' && new Date(card.due_date) <= now).toArray();

    return {
      learning: learningCards.length,
      retaining: retentionDue.length,
      total: learningCards.length + retentionDue.length
    };
  }
};

// Review Session Management
const ReviewSession = {
  cards: [],
  currentIndex: 0,
  mode: null, // 'learning', 'retaining', or 'blitz'
  deckId: null,
  showingAnswer: false,
  sessionProgress: new Map(), // For learning/blitz modes: cardId -> consecutive correct count

  async start(deckId, mode) {
    this.deckId = deckId;
    this.mode = mode;
    this.currentIndex = 0;
    this.showingAnswer = false;
    this.sessionProgress.clear();

    if (mode === 'blitz') {
      // Blitz mode: get all cards in deck for continuous cycling
      this.cards = await db.cards.where('deck_id').equals(deckId).toArray();
      // Initialize session progress tracking
      this.cards.forEach(card => this.sessionProgress.set(card.id, 0));
    } else if (mode === 'learning') {
      // Learning mode: get only cards that are still in learning mode
      this.cards = await db.cards.where('deck_id').equals(deckId).and(card => card.mode === 'learning').toArray();
      // Initialize session progress tracking
      this.cards.forEach(card => this.sessionProgress.set(card.id, 0));
    } else if (mode === 'retaining') {
      // Retention mode: get only due cards (traditional spaced repetition)
      this.cards = await ReviewScheduler.getDueCards(deckId, mode);
    }

    if (this.cards.length === 0) {
      const message = mode === 'blitz'
        ? 'No cards in this deck!'
        : `No cards ${mode === 'retaining' ? 'due for retention' : 'available for'} review!`;
      alert(message);
      return false;
    }

    // Shuffle cards for variety
    this.shuffleCards();
    currentReviewSession = this;
    await this.displayCurrentCard();
    showView('review-session-view');
    return true;
  },

  shuffleCards() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  },

  async displayCurrentCard() {
    if (this.currentIndex >= this.cards.length) {
      // For continuous modes, check if we need to cycle or end
      if (this.mode === 'blitz' || this.mode === 'learning') {
        await this.handleContinuousMode();
        return;
      } else {
        await this.endSession();
        return;
      }
    }

    const card = this.cards[this.currentIndex];
    document.getElementById('review-prompt-text').textContent = card.prompt;
    document.getElementById('review-response-text').textContent = card.response;
    document.getElementById('review-response').style.display = 'none';
    document.getElementById('show-answer-btn').style.display = 'block';
    document.getElementById('review-buttons').style.display = 'none';
    this.showingAnswer = false;

    // Update progress display
    const progress = document.getElementById('review-progress');
    if (this.mode === 'blitz' || this.mode === 'learning') {
      const completed = Array.from(this.sessionProgress.values()).filter(count => count >= 2).length;
      const total = this.sessionProgress.size;
      progress.textContent = `Mastered: ${completed}/${total} | Current: ${this.currentIndex + 1}/${this.cards.length}`;
    } else {
      progress.textContent = `Card ${this.currentIndex + 1} of ${this.cards.length}`;
    }
  },

  async handleContinuousMode() {
    // Check if all cards are mastered (2 consecutive correct)
    const allMastered = Array.from(this.sessionProgress.values()).every(count => count >= 2);
    if (allMastered) {
      await this.endSession();
      return;
    }

    // Filter out mastered cards and continue with remaining
    this.cards = this.cards.filter(c => this.sessionProgress.get(c.id) < 2);
    this.currentIndex = 0;
    this.shuffleCards();
    await this.displayCurrentCard();
  },

  showAnswer() {
    document.getElementById('review-response').style.display = 'block';
    document.getElementById('show-answer-btn').style.display = 'none';
    document.getElementById('review-buttons').style.display = 'block';
    this.showingAnswer = true;
  },

  async answerCard(isCorrect) {
    if (!this.showingAnswer) return;

    const card = this.cards[this.currentIndex];

    if (this.mode === 'blitz' || this.mode === 'learning') {
      // Continuous modes: track consecutive correct answers in session
      const currentCount = this.sessionProgress.get(card.id) || 0;
      if (isCorrect) {
        this.sessionProgress.set(card.id, currentCount + 1);
      } else {
        this.sessionProgress.set(card.id, 0); // Reset on incorrect
      }

      // For learning mode, graduate cards when mastered (but don't update review history)
      if (this.mode === 'learning') {
        const masteryCount = this.sessionProgress.get(card.id) || 0;
        if (isCorrect && masteryCount >= 2) {
          // Graduate to retention mode
          let updatedCard = ReviewScheduler.graduateCard(card);
          await db.cards.update(card.id, {
            mode: updatedCard.mode,
            due_date: updatedCard.due_date
            // Note: review_history is NOT updated for learning attempts
          });
        }
        // Learning cards that aren't graduated don't need database updates
      }

      // Move to next card
      this.currentIndex++;
    } else {
      // Retention mode: traditional spaced repetition
      let updatedCard = ReviewScheduler.scheduleRetainCard(card, isCorrect);

      // Save updated card to database
      await db.cards.update(card.id, {
        mode: updatedCard.mode,
        due_date: updatedCard.due_date,
        review_history: updatedCard.review_history
      });

      this.currentIndex++;
    }

    await this.displayCurrentCard();
  },

  async endSession() {
    let message;
    if (this.mode === 'blitz' || this.mode === 'learning') {
      const completed = Array.from(this.sessionProgress.values()).filter(count => count >= 2).length;
      const total = this.sessionProgress.size;
      if (completed === total) {
        message = `${this.mode === 'blitz' ? 'Blitz' : 'Learning'} session complete! All ${total} cards mastered.`;
      } else {
        message = `${this.mode === 'blitz' ? 'Blitz' : 'Learning'} session ended. Mastered ${completed} of ${total} cards.`;
      }
    } else {
      message = 'Review session complete!';
    }
    alert(message);
    currentReviewSession = null;

    // Refresh the card view to show updated review info
    await loadCards();
    showView('card-view');
  },

  async exitSession() {
    if (confirm('Are you sure you want to exit this review session?')) {
      await this.endSession();
    }
  }
};

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

  // Load and display due card counts and review options
  try {
    const dueCounts = await ReviewScheduler.getDueCounts(currentDeckId);
    const allCards = await db.cards.where('deck_id').equals(currentDeckId).toArray();
    const reviewInfo = document.getElementById('review-info');

    reviewInfo.innerHTML = `
      <div class="review-summary">
        <p><strong>Review Options:</strong></p>
        ${dueCounts.total > 0 ? `<p>Due now - Learning: ${dueCounts.learning} | Retention: ${dueCounts.retaining}</p>` : '<p>No cards due for scheduled review.</p>'}
      </div>
      <div class="review-actions">
        <button onclick="startReview('learning')" ${dueCounts.learning === 0 ? 'disabled' : ''}>
          Learning Mode (${dueCounts.learning} due)
        </button>
        <button onclick="startReview('retaining')" ${dueCounts.retaining === 0 ? 'disabled' : ''}>
          Retention Mode (${dueCounts.retaining} due)
        </button>
        <button onclick="startReview('blitz')" ${allCards.length === 0 ? 'disabled' : ''}>
          Blitz Mode (${allCards.length} cards)
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Error loading review info:', error);
  }

  try {
    const cards = await db.cards.where('deck_id').equals(currentDeckId).toArray();
    const cardList = document.getElementById('card-list');

    if (cards.length === 0) {
      cardList.innerHTML = '<p>No cards yet. Add your first card!</p>';
      return;
    }

    cardList.innerHTML = cards.map(card => {
      const dueDate = new Date(card.due_date);
      const dueStatus = dueDate <= new Date() ? 'Due now' : `Due: ${dueDate.toLocaleDateString()}`;
      const modeDisplay = card.mode || 'learning';

      return `
        <div class="card-item">
          <h4>Prompt: ${card.prompt}</h4>
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
    await db.cards.add({
      deck_id: currentDeckId,
      prompt: prompt,
      response: response,
      mode: 'learning',
      due_date: new Date(), // Due immediately for first review
      review_history: []
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

// Review Functions (called from HTML)
async function startReview(mode) {
  if (!currentDeckId) {
    console.error('No deck selected for review');
    return;
  }

  try {
    console.log(`Starting ${mode} review for deck ${currentDeckId}`);
    const success = await ReviewSession.start(currentDeckId, mode);
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
