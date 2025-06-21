# Tutorial 02: Basic Deck and Card CRUD Operations

## Project Brief
Build on the foundation from Tutorial 01 by implementing basic Create, Read, Update, Delete (CRUD) operations for decks and cards. This tutorial focuses on establishing the core data model and basic functionality without complex UI styling.

## Learning Objectives
- Define and implement a simple data schema for decks and cards
- Set up IndexedDB database with Dexie for local data persistence
- Create basic forms for deck and card management
- Implement full CRUD operations for both decks and cards
- Understand data flow between UI and IndexedDB
- Build a simple navigation system between different views

## Scope for This Tutorial
**IN:** Data schema, database setup, basic forms, CRUD operations, simple navigation
**OUT:** Complex UI styling, validation, error handling, advanced features

## Data Schema Design

For this iteration, we'll use a simple relational model:

### Decks Table
```javascript
{
  id: number (auto-increment primary key),
  name: string (required),
  description: string (optional),
  created_at: Date,
  updated_at: Date
}
```

### Cards Table
```javascript
{
  id: number (auto-increment primary key),
  deck_id: number (foreign key to decks.id),
  prompt: string (required - question/prompt),
  response: string (required - answer/response),
  created_at: Date,
  updated_at: Date
}
```

### Data Relationships
- Each card belongs to exactly one deck (deck_id foreign key)
- Each deck can have multiple cards (one-to-many relationship)
- Deleting a deck will delete all its cards (cascade delete)

## Step-by-Step Implementation

### Step 1: Database Setup

First, we'll modify `script.js` to set up our database schema:

```javascript
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
```

### Step 2: Basic HTML Structure

Update `index.html` to include basic views and forms:

```html
<main>
  <!-- Deck Selection View -->
  <div id="deck-view" class="view">
    <h2>Your Decks</h2>
    <div id="deck-list"></div>
    <button id="new-deck-btn">Create New Deck</button>
  </div>

  <!-- Deck Creation Form -->
  <div id="deck-form-view" class="view hidden">
    <h2>Create New Deck</h2>
    <form id="deck-form">
      <input type="text" id="deck-name" placeholder="Deck Name" required>
      <textarea id="deck-description" placeholder="Description (optional)"></textarea>
      <button type="submit">Create Deck</button>
      <button type="button" id="cancel-deck">Cancel</button>
    </form>
  </div>

  <!-- Card Management View -->
  <div id="card-view" class="view hidden">
    <h2 id="current-deck-name">Deck Name</h2>
    <div id="card-list"></div>
    <button id="new-card-btn">Add New Card</button>
    <button id="back-to-decks">Back to Decks</button>
  </div>

  <!-- Card Creation/Edit Form -->
  <div id="card-form-view" class="view hidden">
    <h2 id="card-form-title">Add New Card</h2>
    <form id="card-form">
      <textarea id="card-prompt" placeholder="Prompt" required></textarea>
      <textarea id="card-response" placeholder="Response" required></textarea>
      <button type="submit" id="card-submit">Add Card</button>
      <button type="button" id="cancel-card">Cancel</button>
    </form>
  </div>
</main>
```

### Step 3: Basic CSS for Forms and Lists

Add to `style.css`:

```css
/* View management */
.view {
  display: block;
}

.view.hidden {
  display: none;
}

/* Form styling */
form {
  max-width: 500px;
  margin: 20px auto;
}

input, textarea {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin: 5px;
}

button:hover {
  background: #0056b3;
}

button[type="button"] {
  background: #6c757d;
}

button[type="button"]:hover {
  background: #545b62;
}

/* List styling */
.deck-item, .card-item {
  border: 1px solid #ddd;
  padding: 15px;
  margin: 10px 0;
  border-radius: 4px;
  background: #f8f9fa;
}

.deck-item h3, .card-item h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.deck-item p {
  color: #6c757d;
  margin: 5px 0;
}

.card-actions, .deck-actions {
  margin-top: 10px;
}

.card-actions button, .deck-actions button {
  font-size: 14px;
  padding: 5px 10px;
}

.delete-btn {
  background: #dc3545;
}

.delete-btn:hover {
  background: #c82333;
}
```

### Step 4: JavaScript CRUD Operations

Now we'll implement the core functionality in `script.js`:

```javascript
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
```

### Step 5: Event Listeners and App Initialization

Add the event handling code:

```javascript
// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM loaded, initializing app...');

  // Initialize database
  try {
    await db.open();
    console.log('Database opened successfully');
    await loadDecks();
  } catch (error) {
    console.error('Database error:', error);
    document.getElementById('status').textContent = 'Database error: ' + error.message;
    document.getElementById('status').style.color = '#dc3545';
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

  // Remove the old status message
  document.getElementById('status').style.display = 'none';
});
```

## Data Flow Explanation

Understanding how data flows through the application:

### 1. Database Layer (IndexedDB via Dexie)
- **Storage**: Data persists locally in the browser's IndexedDB
- **Schema**: Two tables (decks, cards) with automatic timestamps
- **Relationships**: Cards reference decks via `deck_id` foreign key

### 2. Application State
- `currentDeckId`: Tracks which deck is currently selected
- `currentCardId`: Tracks which card is being edited (null for new cards)

### 3. Data Flow Patterns

**Creating a Deck:**
1. User fills form → Form submit event
2. `createDeck()` function → `db.decks.add()`
3. Database stores with auto-generated ID and timestamps
4. `loadDecks()` refreshes the UI → DOM updated

**Selecting a Deck:**
1. User clicks "View Cards" → `selectDeck(deckId)`
2. Sets `currentDeckId` state
3. `loadCards()` queries cards where `deck_id = currentDeckId`
4. Card list view populated with results

**Creating/Editing Cards:**
1. Form submission → Check if `currentCardId` exists
2. If null: `createCard()` → `db.cards.add()` with `currentDeckId`
3. If exists: `updateCard()` → `db.cards.update()`
4. `loadCards()` refreshes current deck's card list

**Deleting with Cascade:**
1. Delete deck → First delete all cards with matching `deck_id`
2. Then delete the deck record
3. Maintains referential integrity

## How to Test

### Step 1: Update Your Files
Replace the contents of your existing files with the code from this tutorial:

1. Update `index.html` with the new HTML structure
2. Update `style.css` with the form and list styling
3. Replace `script.js` with the complete CRUD implementation

### Step 2: Test the Complete Flow

1. **Start your development server** (same as Tutorial 01)
2. **Open the application** in your browser
3. **Test deck operations:**
   - [ ] Create a new deck with name and description
   - [ ] Verify it appears in the deck list
   - [ ] Create a second deck
   - [ ] Delete one deck (confirm it's removed)

4. **Test card operations:**
   - [ ] Select a deck to view its cards
   - [ ] Add a new card with prompt and response content
   - [ ] Add several more cards
   - [ ] Edit an existing card
   - [ ] Delete a card
   - [ ] Navigate back to deck list

5. **Test data persistence:**
   - [ ] Refresh the browser page
   - [ ] Verify all decks and cards are still there
   - [ ] Close and reopen the browser tab
   - [ ] Data should persist (stored in IndexedDB)

6. **Test edge cases:**
   - [ ] Try to create deck with empty name (should not work)
   - [ ] Try to create card with empty prompt or response (should not work)
   - [ ] Delete a deck with cards (should delete all cards too)

### Step 3: Browser Developer Tools Testing

1. **Open DevTools (F12)**
2. **Check Console tab:**
   - Should see successful database operations logged
   - No error messages

3. **Check Application/Storage tab:**
   - Navigate to IndexedDB → MimirDB
   - Inspect 'decks' and 'cards' object stores
   - Verify data structure matches schema

## Learning Notes

### What We Accomplished
- Implemented a complete CRUD system for decks and cards
- Set up proper database relationships with foreign keys
- Created a simple but functional navigation system
- Added automatic timestamp management
- Built forms with basic validation
- Implemented cascade delete for data integrity

### Key Concepts Introduced

**Database Design:**
- **Primary Keys**: Auto-incrementing IDs for unique record identification
- **Foreign Keys**: `deck_id` links cards to their parent deck
- **Timestamps**: Automatic `created_at` and `updated_at` tracking
- **Cascade Delete**: Removing a deck removes all its cards

**Application Architecture:**
- **State Management**: Global variables track current context
- **View Management**: Show/hide different UI sections
- **Event-Driven**: User actions trigger database operations
- **Async Operations**: All database calls use async/await

**Data Flow Patterns:**
- **Create**: Form → Validation → Database → UI Refresh
- **Read**: Database Query → DOM Manipulation → Display
- **Update**: Load existing → Form → Validation → Database → UI Refresh
- **Delete**: Confirmation → Database → UI Refresh

### Why This Architecture Works

1. **Simple State**: Two variables track current context
2. **Separation of Concerns**: Database, UI, and business logic are distinct
3. **Consistent Patterns**: All CRUD operations follow similar flow
4. **Error Handling**: Try/catch blocks prevent crashes
5. **User Feedback**: Console logging and UI updates confirm actions

## Success Criteria

By the end of this tutorial, you should have:
- ✅ A working database with decks and cards tables
- ✅ Forms to create and edit decks and cards
- ✅ Lists showing all decks and cards within selected deck
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Navigation between deck list and card management views
- ✅ Data persistence across browser sessions
- ✅ Cascade delete (removing deck removes its cards)
- ✅ Basic form validation (required fields)

## Next Tutorial Preview

Tutorial 03 will focus on improving the user experience with:
- Basic Spacing and Scheduling
  - database updates (new version for IndexedDB)
    - card mode (learn or retain)
    - due date
    - review history
  - scheduler
    - learning mode scheduler: if correct once, show in 20s; if second correct, graduate to retain
    - retain mode scheduler: 2^n scheduler. retention mode starts with n at 0. n is retrieved from review history as number correct.

## Questions for Future Development

1. **Search**: How should users find specific cards across multiple decks?
2. **Import/Export**: What format should we use for sharing decks?
3. **Validation**: What other validation rules do we need?
4. **Performance**: How do we handle large numbers of cards efficiently?
5. **Backup**: Should we add cloud sync or export capabilities?
```
```
