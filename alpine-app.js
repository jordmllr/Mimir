// Mimir v2 - Alpine.js Reactive Implementation
console.log('Mimir v2 Alpine.js starting...');

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

// UI-specific ReviewSession wrapper that extends our tested ReviewSession class
class UIReviewSession extends ReviewSession {
  constructor(alpineApp) {
    super(db);
    this.alpineApp = alpineApp;
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

    this.alpineApp.currentReviewSession = this;
    await this.displayCurrentCard();
    this.alpineApp.currentView = 'review-session';
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

    // Update Alpine.js reactive data
    this.alpineApp.reviewCard = {
      prompt: card.prompt,
      response: card.response,
      showingAnswer: false
    };

    // Update progress display
    if (this.mode === 'blitz' || this.mode === 'learning') {
      const stats = this.getSessionStats();
      this.alpineApp.reviewProgress = `Mastered: ${stats.completed}/${stats.total} | Current: ${this.currentIndex + 1}/${this.cards.length}`;
    } else {
      this.alpineApp.reviewProgress = `Card ${this.currentIndex + 1} of ${this.cards.length}`;
    }
  }

  showAnswer() {
    this.alpineApp.reviewCard.showingAnswer = true;
  }

  async answerCard(isCorrect) {
    if (!this.alpineApp.reviewCard.showingAnswer) return;

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
    this.alpineApp.currentReviewSession = null;

    // Refresh the card view to show updated review info
    await this.alpineApp.loadCards();
    this.alpineApp.currentView = 'card';
  }

  async exitSession() {
    if (confirm('Are you sure you want to exit this review session?')) {
      await this.endSession();
    }
  }
}

// Main Alpine.js App Component
function mimirApp() {
  return {
    // Reactive state
    currentView: 'deck',
    currentDeckId: null,
    currentCardId: null,
    currentReviewSession: null,
    mobileMenuOpen: false,
    
    // Data arrays
    decks: [],
    cards: [],
    dueCounts: { learning: 0, retaining: 0 },
    
    // Review session data
    reviewCard: {
      prompt: '',
      response: '',
      showingAnswer: false
    },
    reviewProgress: '',
    
    // Form data
    deckForm: {
      name: '',
      description: ''
    },
    cardForm: {
      prompt: '',
      response: '',
      title: 'Add New Card',
      submitText: 'Add Card'
    },

    // Computed properties
    get currentDeck() {
      return this.decks.find(deck => deck.id === this.currentDeckId) || null;
    },

    // Helper methods
    isViewActive(viewName) {
      return this.currentView === viewName;
    },

    // Initialization
    async init() {
      console.log('Alpine.js app initializing...');

      try {
        await database.db.open();
        console.log('Database opened successfully');
        await this.loadDecks();
        this.currentView = 'deck'; // Show deck selection by default
      } catch (error) {
        console.error('Database error:', error);
        alert('Database error: ' + error.message);
        return;
      }

      console.log('Alpine.js app initialization complete');
    },

    // View management
    showView(viewName) {
      this.currentView = viewName;
    },

    // Deck operations
    async loadDecks() {
      try {
        this.decks = await database.getAllDecks();
        this.decks.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error('Error loading decks:', error);
      }
    },

    async createDeck() {
      if (!this.deckForm.name.trim()) return;
      
      try {
        await database.createDeck(this.deckForm.name.trim(), this.deckForm.description.trim());
        console.log('Deck created successfully');
        await this.loadDecks();
        this.deckForm = { name: '', description: '' };
        this.showView('deck');
      } catch (error) {
        console.error('Error creating deck:', error);
      }
    },

    async deleteDeck(deckId) {
      if (!confirm('Are you sure? This will delete the deck and all its cards.')) {
        return;
      }

      try {
        await database.deleteDeck(deckId);
        console.log('Deck deleted successfully');
        await this.loadDecks();
      } catch (error) {
        console.error('Error deleting deck:', error);
      }
    },

    async selectDeck(deckId) {
      this.currentDeckId = deckId;
      this.mobileMenuOpen = false; // Close mobile menu when deck is selected
      try {
        await this.loadCards();
        await this.loadDecks(); // Refresh to update active state
        this.showView('card');
      } catch (error) {
        console.error('Error selecting deck:', error);
      }
    },

    // Card operations
    async loadCards() {
      if (!this.currentDeckId) return;

      try {
        // Load due counts for review tiles
        this.dueCounts = await ReviewScheduler.getDueCounts(db, this.currentDeckId);
        
        // Load all cards
        this.cards = await database.getCardsByDeck(this.currentDeckId);
      } catch (error) {
        console.error('Error loading cards:', error);
      }
    },

    async createCard() {
      if (!this.currentDeckId || !this.cardForm.prompt.trim() || !this.cardForm.response.trim()) return;

      try {
        if (this.currentCardId) {
          await database.updateCard(this.currentCardId, {
            prompt: this.cardForm.prompt.trim(),
            response: this.cardForm.response.trim()
          });
          console.log('Card updated successfully');
        } else {
          await database.createCard(this.currentDeckId, this.cardForm.prompt.trim(), this.cardForm.response.trim());
          console.log('Card created successfully');
        }
        
        await this.loadCards();
        this.cardForm = { prompt: '', response: '', title: 'Add New Card', submitText: 'Add Card' };
        this.currentCardId = null;
        this.showView('card');
      } catch (error) {
        console.error('Error saving card:', error);
      }
    },

    async editCard(cardId) {
      try {
        const card = await database.getCard(cardId);
        this.currentCardId = cardId;
        this.cardForm = {
          prompt: card.prompt,
          response: card.response,
          title: 'Edit Card',
          submitText: 'Update Card'
        };
        this.showView('card-form');
      } catch (error) {
        console.error('Error loading card for edit:', error);
      }
    },

    async deleteCard(cardId) {
      if (!confirm('Are you sure you want to delete this card?')) {
        return;
      }

      try {
        await database.deleteCard(cardId);
        console.log('Card deleted successfully');
        await this.loadCards();
      } catch (error) {
        console.error('Error deleting card:', error);
      }
    },

    // Review operations
    async startReview(mode) {
      if (!this.currentDeckId) {
        console.error('No deck selected for review');
        return;
      }

      try {
        console.log(`Starting ${mode} review for deck ${this.currentDeckId}`);
        const session = new UIReviewSession(this);
        const success = await session.start(this.currentDeckId, mode);
        if (!success) {
          // No cards available, stay on current view
          console.log(`No cards available for ${mode} review`);
          return;
        }
      } catch (error) {
        console.error('Error starting review:', error);
        alert('Error starting review: ' + error.message);
      }
    },

    showAnswer() {
      if (this.currentReviewSession) {
        this.currentReviewSession.showAnswer();
      }
    },

    async answerCorrect() {
      if (this.currentReviewSession) {
        await this.currentReviewSession.answerCard(true);
      }
    },

    async answerIncorrect() {
      if (this.currentReviewSession) {
        await this.currentReviewSession.answerCard(false);
      }
    },

    async exitSession() {
      if (this.currentReviewSession) {
        await this.currentReviewSession.exitSession();
      }
    },

    // Form helpers
    resetDeckForm() {
      this.deckForm = { name: '', description: '' };
      this.showView('deck');
    },

    resetCardForm() {
      this.cardForm = { prompt: '', response: '', title: 'Add New Card', submitText: 'Add Card' };
      this.currentCardId = null;
      this.showView('card');
    },

    showNewCardForm() {
      this.currentCardId = null;
      this.cardForm = { prompt: '', response: '', title: 'Add New Card', submitText: 'Add Card' };
      this.showView('card-form');
    },

    // Utility methods
    formatDate(date) {
      return new Date(date).toLocaleDateString();
    },

    getDueStatus(card) {
      const dueDate = new Date(card.due_date);
      return dueDate <= new Date() ? 'Due now' : `Due: ${this.formatDate(dueDate)}`;
    }
  };
}

// Make the app component globally available
window.mimirApp = mimirApp;

// Register with Alpine.js when it's available
document.addEventListener('alpine:init', () => {
  console.log('Alpine.js initializing with mimirApp');
  Alpine.data('mimirApp', mimirApp);
});

console.log('Alpine.js app component loaded');
