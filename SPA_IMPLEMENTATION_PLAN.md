# Mimir SPA Implementation Plan

## Pre-Implementation Setup

### 1. Backup & Branch Creation
```bash
# Create backup of current working version
git add .
git commit -m "Backup before SPA refactor"
git tag backup-pre-spa

# Create feature branch
git checkout -b spa-redesign
```

### 2. File Audit & Cleanup Strategy

#### Files to DELETE (Complete Removal)
```
# HTML Files (4 files → 0, keeping only index.html)
review.html
manage.html
learn.html
manage-udc.html

# Test/Demo Files (8 files)
theme-test.html
mobile-test.html
test-navigation.html
swipe-test.html
create-test-card.html
test-learning.html
test-scheduler.html
test-suite.html

# Import/Demo Files (4 files)
import-git-deck.html
import-hierarchical-git.html
import-test-deck.html
import-udc-git.html

# JavaScript Files to Consolidate/Remove (6 files)
js/theme-manager.js          # Delete entirely (300 lines)
js/card-management.js        # Merge into new structure
js/card-management-udc.js    # Merge into new structure
js/deck-hierarchy.js         # Merge into new structure
js/user_interactions.js      # Integrate into main app
js/udc-classifier.js         # Merge into deck service

# Miscellaneous
color_pallette.jpg           # No longer needed
test_deck_spanish_ir.json    # Move to public_data if needed
```

#### Files to TRANSFORM
```
# Core Files
index.html                   → Complete SPA redesign
css/styles.css              → css/app.css (70% smaller)

# JavaScript Components
js/card-creation.js         → js/components/card-creator.js
js/card-review.js           → js/components/card-reviewer.js
js/card-learning.js         → js/components/card-learner.js
js/focus-mode.js            → js/utils/focus-mode.js (simplified)
js/database-dexie.js        → js/services/database.js
js/scheduler.js             → js/services/scheduler.js
js/learning-scheduler.js    → Merge into scheduler.js
```

#### Files to CREATE
```
js/app.js                   # Main application controller
js/components/card-manager.js # Unified card management
js/components/deck-selector.js # Unified deck handling
js/services/storage.js      # LocalStorage abstraction
js/utils/swipe-handler.js   # Swipe gesture handling
js/utils/navigation.js      # URL routing (optional)
```

## Phase 1: Core SPA Structure (Days 1-2)

### Day 1 Morning: File Cleanup
1. **Delete unused files** (complete list above)
2. **Create new directory structure**:
   ```
   js/
   ├── app.js
   ├── components/
   ├── services/
   └── utils/
   ```
3. **Rename css/styles.css** → css/app.css

### Day 1 Afternoon: New index.html
1. **Create new SPA structure**:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <meta name="theme-color" content="#faf8f5">
       <title>Mimir</title>
       <link rel="stylesheet" href="css/app.css">
       <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
       <script src="https://unpkg.com/dexie@3.2.4/dist/dexie.js"></script>
   </head>
   <body x-data="mimirApp()" x-init="init()">
       <!-- Loading State -->
       <div x-show="isLoading" class="loading-overlay">
           <div class="loading-content">Loading...</div>
       </div>

       <!-- Main App Content -->
       <main class="app-container" x-show="!isLoading">
           <!-- Create View -->
           <section x-show="view === 'create'" x-data="cardCreator()" class="view-container">
               <!-- Card creation interface -->
           </section>

           <!-- Review View -->
           <section x-show="view === 'review'" x-data="cardReviewer()" class="view-container">
               <!-- Card review interface -->
           </section>

           <!-- Manage View -->
           <section x-show="view === 'manage'" x-data="cardManager()" class="view-container">
               <!-- Card management interface -->
           </section>
       </main>

       <!-- Bottom Navigation -->
       <nav class="bottom-nav" x-show="!isLoading && !focusMode">
           <button @click="setView('create')" :class="{'active': view === 'create'}">
               <svg class="nav-icon"><!-- create icon --></svg>
               <span>Create</span>
           </button>
           <button @click="setView('review')" :class="{'active': view === 'review'}">
               <svg class="nav-icon"><!-- review icon --></svg>
               <span>Review</span>
           </button>
           <button @click="setView('manage')" :class="{'active': view === 'manage'}">
               <svg class="nav-icon"><!-- manage icon --></svg>
               <span>Manage</span>
           </button>
       </nav>

       <!-- Focus Mode Toggle -->
       <button @click="toggleFocusMode()" class="focus-toggle" :class="{'active': focusMode}">
           <span>◉</span>
       </button>

       <script src="js/app.js"></script>
   </body>
   </html>
   ```

### Day 2: Main App Controller
1. **Create js/app.js** with unified state management:
   ```javascript
   // Main application controller
   function mimirApp() {
       return {
           // Core state
           view: 'create',
           isLoading: true,
           focusMode: false,

           // Global data
           cards: [],
           decks: [],
           dueCards: [],

           // Navigation
           setView(newView) {
               this.view = newView;
               // Optional: update URL hash
               window.location.hash = newView;
           },

           // Focus mode
           toggleFocusMode() {
               this.focusMode = !this.focusMode;
               document.body.classList.toggle('focus-mode', this.focusMode);
           },

           // Initialization
           async init() {
               try {
                   await this.loadServices();
                   await this.loadInitialData();
                   this.setupKeyboardShortcuts();
                   this.setupHashRouting();
                   this.isLoading = false;
               } catch (error) {
                   console.error('App initialization failed:', error);
                   this.isLoading = false;
               }
           },

           async loadServices() {
               // Initialize database and other services
               window.db = new DatabaseService();
               window.scheduler = new SchedulerService();
           },

           async loadInitialData() {
               this.cards = await window.db.getAllCards();
               this.decks = await window.db.getAllDecks();
               this.dueCards = await window.scheduler.getDueCards();
           },

           setupKeyboardShortcuts() {
               document.addEventListener('keydown', (e) => {
                   if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                   switch(e.key) {
                       case '1': this.setView('create'); break;
                       case '2': this.setView('review'); break;
                       case '3': this.setView('manage'); break;
                       case 'f': case 'F': this.toggleFocusMode(); break;
                   }
               });
           },

           setupHashRouting() {
               // Simple hash-based routing
               const hash = window.location.hash.slice(1);
               if (['create', 'review', 'manage'].includes(hash)) {
                   this.view = hash;
               }

               window.addEventListener('hashchange', () => {
                   const newHash = window.location.hash.slice(1);
                   if (['create', 'review', 'manage'].includes(newHash)) {
                       this.view = newHash;
                   }
               });
           }
       }
   }
   ```

2. **Test basic navigation** and view switching

## Phase 2: Component Migration (Days 3-5)

### Day 3: Service Layer
1. **Create js/services/database.js** (unified database operations)
2. **Create js/services/scheduler.js** (unified scheduling logic)
3. **Create js/services/storage.js** (localStorage abstraction)

### Day 4: Core Components
1. **Create js/components/card-creator.js** (migrate from card-creation.js)
2. **Create js/components/card-reviewer.js** (migrate from card-review.js)
3. **Test create and review functionality**

### Day 5: Management Components
1. **Create js/components/card-manager.js** (consolidate management files)
2. **Create js/components/deck-selector.js** (unified deck handling)
3. **Test management functionality**

## Phase 3: Styling & Polish (Days 6-7)

### Day 6: CSS Redesign
1. **Create css/app.css** with simplified paper theme
2. **Implement mobile-first responsive design**
3. **Remove all theme switching complexity**
4. **Add smooth view transitions**

### Day 7: Utils & Features
1. **Create js/utils/focus-mode.js** (simplified)
2. **Create js/utils/swipe-handler.js** (touch gestures)
3. **Add loading states and error handling**
4. **Performance testing**

## Phase 4: Final Cleanup (Day 8)

### Morning: File Removal
1. **Delete all unused files** (final cleanup)
2. **Update .gitignore** if needed
3. **Clean up public_data directory**

### Afternoon: Testing & Documentation
1. **Comprehensive testing** on mobile and desktop
2. **Update README.md**
3. **Create deployment checklist**
4. **Performance audit**

## File Deletion Checklist

### Execute these deletions in Phase 4:
```bash
# HTML files
rm review.html manage.html learn.html manage-udc.html
rm theme-test.html mobile-test.html test-navigation.html swipe-test.html
rm create-test-card.html test-learning.html test-scheduler.html test-suite.html
rm import-git-deck.html import-hierarchical-git.html import-test-deck.html import-udc-git.html

# JavaScript files
rm js/theme-manager.js js/card-management.js js/card-management-udc.js
rm js/deck-hierarchy.js js/user_interactions.js js/udc-classifier.js

# Assets
rm color_pallette.jpg test_deck_spanish_ir.json

# Rename
mv css/styles.css css/app.css
```

## Success Criteria

### Functional Requirements:
- [ ] All three views (create, review, manage) work correctly
- [ ] Navigation between views is instant
- [ ] Focus mode toggles properly
- [ ] Swipe gestures work on mobile
- [ ] Database operations function correctly
- [ ] Keyboard shortcuts work

### Performance Requirements:
- [ ] Initial page load < 2 seconds
- [ ] View switching < 100ms
- [ ] CSS bundle < 50KB
- [ ] JavaScript bundle < 100KB
- [ ] No console errors

### Code Quality:
- [ ] 60% reduction in total files
- [ ] 40% reduction in lines of code
- [ ] Single source of truth for state
- [ ] Modular, testable components
- [ ] Clean, maintainable architecture

## Risk Mitigation

### Backup Strategy:
- Git tag before starting each phase
- Keep parallel branch until testing complete
- Document any breaking changes

### Testing Strategy:
- Test after each component migration
- Mobile and desktop testing
- Cross-browser compatibility check
- Performance regression testing

## Detailed Component Specifications

### js/components/card-creator.js
```javascript
function cardCreator() {
    return {
        // Form data
        prompt: '',
        response: '',
        tags: '',

        // State
        isSaving: false,
        message: '',

        // Methods
        async saveCard() {
            if (!this.prompt.trim() || !this.response.trim()) {
                this.showMessage('Both prompt and response are required', 'error');
                return;
            }

            this.isSaving = true;
            try {
                const card = {
                    prompt: this.prompt.trim(),
                    response: this.response.trim(),
                    tags: this.tags.trim(),
                    created: new Date(),
                    due: new Date() // Due immediately for new cards
                };

                await window.db.saveCard(card);
                this.resetForm();
                this.showMessage('Card saved successfully!', 'success');

                // Update global state
                this.$dispatch('card-created', card);
            } catch (error) {
                this.showMessage('Failed to save card', 'error');
                console.error(error);
            } finally {
                this.isSaving = false;
            }
        },

        resetForm() {
            this.prompt = '';
            this.response = '';
            this.tags = '';
        },

        handleSwipe(direction) {
            if (direction === 'right') {
                this.saveCard();
            } else if (direction === 'left') {
                this.resetForm();
            }
        },

        showMessage(text, type) {
            this.message = text;
            setTimeout(() => this.message = '', 3000);
        }
    }
}
```

### js/components/card-reviewer.js
```javascript
function cardReviewer() {
    return {
        // State
        currentCard: null,
        showingAnswer: false,
        dueCards: [],
        currentIndex: 0,
        isLoading: false,

        // Computed
        get hasCards() {
            return this.dueCards.length > 0;
        },

        get progress() {
            return this.dueCards.length > 0 ?
                `${this.currentIndex + 1} of ${this.dueCards.length}` : '0 of 0';
        },

        // Methods
        async init() {
            await this.loadDueCards();
        },

        async loadDueCards() {
            this.isLoading = true;
            try {
                this.dueCards = await window.scheduler.getDueCards();
                if (this.dueCards.length > 0) {
                    this.currentCard = this.dueCards[0];
                    this.currentIndex = 0;
                }
            } catch (error) {
                console.error('Failed to load due cards:', error);
            } finally {
                this.isLoading = false;
            }
        },

        showAnswer() {
            this.showingAnswer = true;
        },

        async reviewCard(rating) {
            if (!this.currentCard) return;

            try {
                await window.scheduler.scheduleCard(this.currentCard.id, rating);
                this.nextCard();
            } catch (error) {
                console.error('Failed to review card:', error);
            }
        },

        nextCard() {
            this.showingAnswer = false;
            this.currentIndex++;

            if (this.currentIndex >= this.dueCards.length) {
                // Session complete
                this.currentCard = null;
                this.dueCards = [];
                this.currentIndex = 0;
            } else {
                this.currentCard = this.dueCards[this.currentIndex];
            }
        }
    }
}
```

### js/components/card-manager.js
```javascript
function cardManager() {
    return {
        // State
        selectedDeck: null,
        cards: [],
        decks: [],
        searchTerm: '',
        isLoading: false,
        editingCard: null,

        // Computed
        get filteredCards() {
            if (!this.searchTerm) return this.cards;
            const term = this.searchTerm.toLowerCase();
            return this.cards.filter(card =>
                card.prompt.toLowerCase().includes(term) ||
                card.response.toLowerCase().includes(term) ||
                (card.tags && card.tags.toLowerCase().includes(term))
            );
        },

        // Methods
        async init() {
            await this.loadDecks();
            await this.loadCards();
        },

        async loadDecks() {
            try {
                this.decks = await window.db.getAllDecks();
            } catch (error) {
                console.error('Failed to load decks:', error);
            }
        },

        async loadCards(deckId = null) {
            this.isLoading = true;
            try {
                this.cards = await window.db.getCards(deckId);
            } catch (error) {
                console.error('Failed to load cards:', error);
            } finally {
                this.isLoading = false;
            }
        },

        selectDeck(deck) {
            this.selectedDeck = deck;
            this.loadCards(deck?.id);
        },

        editCard(card) {
            this.editingCard = { ...card };
        },

        async saveCard(card) {
            try {
                await window.db.updateCard(card.id, card);
                await this.loadCards(this.selectedDeck?.id);
                this.editingCard = null;
            } catch (error) {
                console.error('Failed to save card:', error);
            }
        },

        async deleteCard(cardId) {
            if (!confirm('Are you sure you want to delete this card?')) return;

            try {
                await window.db.deleteCard(cardId);
                await this.loadCards(this.selectedDeck?.id);
            } catch (error) {
                console.error('Failed to delete card:', error);
            }
        },

        cancelEdit() {
            this.editingCard = null;
        }
    }
}
```

### js/services/database.js
```javascript
class DatabaseService {
    constructor() {
        this.db = new Dexie('MimirDB');
        this.db.version(1).stores({
            cards: '++id, prompt, response, tags, created, due, interval, easeFactor',
            decks: '++id, name, path, type, created'
        });
    }

    async getAllCards() {
        return await this.db.cards.orderBy('created').reverse().toArray();
    }

    async getCards(deckId = null) {
        if (deckId) {
            return await this.db.cards.where('deckId').equals(deckId).toArray();
        }
        return await this.getAllCards();
    }

    async saveCard(card) {
        return await this.db.cards.add({
            ...card,
            interval: 1,
            easeFactor: 2.5,
            created: new Date(),
            due: new Date()
        });
    }

    async updateCard(cardId, updates) {
        return await this.db.cards.update(cardId, updates);
    }

    async deleteCard(cardId) {
        return await this.db.cards.delete(cardId);
    }

    async getAllDecks() {
        return await this.db.decks.orderBy('name').toArray();
    }

    async createDeck(name, path = '', type = 'flat') {
        return await this.db.decks.add({
            name,
            path,
            type,
            created: new Date()
        });
    }
}
```

### js/services/scheduler.js
```javascript
class SchedulerService {
    constructor() {
        this.db = window.db || new DatabaseService();
    }

    async getDueCards() {
        const now = new Date();
        return await this.db.db.cards
            .where('due')
            .belowOrEqual(now)
            .toArray();
    }

    async scheduleCard(cardId, rating) {
        const card = await this.db.db.cards.get(cardId);
        if (!card) throw new Error('Card not found');

        const { interval, easeFactor, due } = this.calculateNextReview(card, rating);

        await this.db.updateCard(cardId, {
            interval,
            easeFactor,
            due,
            lastReviewed: new Date()
        });
    }

    calculateNextReview(card, rating) {
        let { interval = 1, easeFactor = 2.5 } = card;

        if (rating >= 3) { // Good response
            if (interval === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }
            easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
        } else { // Poor response
            interval = 1;
        }

        easeFactor = Math.max(1.3, easeFactor);
        const due = new Date();
        due.setDate(due.getDate() + interval);

        return { interval, easeFactor, due };
    }
}
```

## CSS Simplification Strategy

### css/app.css Structure
```css
/* 1. CSS Variables (Paper theme only) */
:root {
    --bg: #faf8f5;
    --bg-secondary: #f5f2ed;
    --text: #2c2c2c;
    --text-secondary: #4a4a4a;
    --accent: #3c3c3c;
    --border: rgba(60, 60, 60, 0.1);
    --shadow: rgba(0, 0, 0, 0.1);
    --error: #8b4444;
    --success: #4a6b4a;
}

/* 2. Base styles (mobile-first) */
/* 3. Layout components */
/* 4. Navigation */
/* 5. Focus mode */
/* 6. Responsive enhancements */
```

This plan transforms Mimir into a modern, maintainable SPA while eliminating 60% of the current complexity.
