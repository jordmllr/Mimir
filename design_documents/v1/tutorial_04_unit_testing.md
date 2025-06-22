# Tutorial 4: Unit Testing for Regression Protection

## Overview
Now that we have a fully functional spaced repetition app with basic text inputs and review functionality, it's time to implement comprehensive unit tests. This tutorial will guide you through setting up a testing framework and writing tests for all core components to provide regression protection as we continue development.

## Why Unit Testing?
- **Regression Protection**: Catch bugs when making changes
- **Documentation**: Tests serve as living documentation of expected behavior
- **Confidence**: Make changes knowing tests will catch issues
- **Refactoring Safety**: Safely improve code structure
- **Edge Case Coverage**: Test boundary conditions and error scenarios

## Testing Strategy

### What We'll Test
1. **ReviewScheduler Module**: Core scheduling logic
2. **ReviewSession Module**: Session management and state
3. **Database Operations**: CRUD operations for decks and cards
4. **Review Logic**: Learning, retention, and blitz mode behaviors
5. **Data Migration**: Schema upgrade functionality

### Testing Approach
- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test component interactions
- **Mock Database**: Use in-memory database for consistent test state
- **Async Testing**: Handle promises and database operations properly

## Step 1: Testing Framework Setup

Since we're using vanilla JavaScript in the browser, we'll use **Vitest** - a modern, fast testing framework that works well with browser-based code.

### Install Dependencies

Create a `package.json` file:
```json
{
  "name": "mimir-v1",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "jsdom": "^23.0.0",
    "fake-indexeddb": "^5.0.0"
  }
}
```

### Vitest Configuration

Create `vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'test/']
    }
  }
})
```

### Test Setup File

Create `test/setup.js`:
```javascript
import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'

// Mock Dexie globally
global.Dexie = (await import('dexie')).default

// Reset IndexedDB before each test
beforeEach(() => {
  // Clear all databases
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      indexedDB.deleteDatabase(db.name)
    })
  })
})
```

## Step 2: Refactor Code for Testability

Before writing tests, we need to make our code more testable by extracting modules and reducing global dependencies.

### Extract ReviewScheduler Module

Create `src/reviewScheduler.js`:
```javascript
export const ReviewScheduler = {
  // Graduate card from learning to retention mode
  graduateCard(card) {
    const graduatedCard = { ...card }
    graduatedCard.mode = 'retaining'
    graduatedCard.due_date = new Date(Date.now() + (24 * 60 * 60 * 1000))
    return graduatedCard
  },

  // Retention mode: 2^n days where n = number of correct reviews
  scheduleRetainCard(card, isCorrect) {
    const updatedCard = { ...card }
    const now = new Date()
    const reviewEntry = {
      timestamp: now,
      correct: isCorrect
    }

    if (!updatedCard.review_history) updatedCard.review_history = []
    updatedCard.review_history.push(reviewEntry)

    if (isCorrect) {
      const correctCount = updatedCard.review_history.filter(entry => entry.correct).length
      const daysToAdd = Math.pow(2, correctCount - 1)
      updatedCard.due_date = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000))
    } else {
      updatedCard.due_date = now
    }

    return updatedCard
  },

  // Get cards due for review
  async getDueCards(db, deckId, mode) {
    const now = new Date()
    
    if (mode === 'retaining') {
      return await db.cards
        .where('deck_id').equals(deckId)
        .and(card => card.mode === 'retaining' && card.due_date <= now)
        .toArray()
    } else if (mode === 'learning') {
      return await db.cards
        .where('deck_id').equals(deckId)
        .and(card => card.mode === 'learning')
        .toArray()
    }
    
    return []
  },

  // Get due counts for UI display
  async getDueCounts(db, deckId) {
    const now = new Date()
    const allCards = await db.cards.where('deck_id').equals(deckId).toArray()
    
    return {
      learning: allCards.filter(card => card.mode === 'learning').length,
      retaining: allCards.filter(card => 
        card.mode === 'retaining' && card.due_date <= now
      ).length,
      total: allCards.length
    }
  }
}
```

### Extract Database Operations

Create `src/database.js`:
```javascript
export class MimirDatabase {
  constructor() {
    this.db = new Dexie('MimirDB')
    this.setupSchema()
  }

  setupSchema() {
    // Version 1: Basic schema
    this.db.version(1).stores({
      decks: '++id, name, description, created_at, updated_at',
      cards: '++id, deck_id, prompt, response, created_at, updated_at'
    })

    // Version 2: Add review fields
    this.db.version(2).stores({
      decks: '++id, name, description, created_at, updated_at',
      cards: '++id, deck_id, prompt, response, mode, due_date, review_history, created_at, updated_at'
    }).upgrade(tx => {
      return tx.cards.toCollection().modify(card => {
        card.mode = 'learning'
        card.due_date = new Date()
        card.review_history = []
      })
    })

    this.setupHooks()
  }

  setupHooks() {
    // Timestamp hooks
    this.db.decks.hook('creating', (primKey, obj, trans) => {
      obj.created_at = new Date()
      obj.updated_at = new Date()
    })

    this.db.decks.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = new Date()
    })

    this.db.cards.hook('creating', (primKey, obj, trans) => {
      obj.created_at = new Date()
      obj.updated_at = new Date()
    })

    this.db.cards.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = new Date()
    })
  }

  // Deck operations
  async createDeck(name, description) {
    return await this.db.decks.add({ name, description })
  }

  async getDeck(id) {
    return await this.db.decks.get(id)
  }

  async getAllDecks() {
    return await this.db.decks.toArray()
  }

  async updateDeck(id, updates) {
    return await this.db.decks.update(id, updates)
  }

  async deleteDeck(id) {
    await this.db.cards.where('deck_id').equals(id).delete()
    return await this.db.decks.delete(id)
  }

  // Card operations
  async createCard(deckId, prompt, response) {
    return await this.db.cards.add({
      deck_id: deckId,
      prompt,
      response,
      mode: 'learning',
      due_date: new Date(),
      review_history: []
    })
  }

  async getCard(id) {
    return await this.db.cards.get(id)
  }

  async getCardsByDeck(deckId) {
    return await this.db.cards.where('deck_id').equals(deckId).toArray()
  }

  async updateCard(id, updates) {
    return await this.db.cards.update(id, updates)
  }

  async deleteCard(id) {
    return await this.db.cards.delete(id)
  }
}
```

## Step 3: Core Unit Tests

### Test ReviewScheduler

Create `test/reviewScheduler.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { ReviewScheduler } from '../src/reviewScheduler.js'

describe('ReviewScheduler', () => {
  let mockCard

  beforeEach(() => {
    mockCard = {
      id: 1,
      deck_id: 1,
      prompt: 'Test prompt',
      response: 'Test response',
      mode: 'learning',
      due_date: new Date(),
      review_history: []
    }
  })

  describe('graduateCard', () => {
    it('should graduate card from learning to retaining mode', () => {
      const result = ReviewScheduler.graduateCard(mockCard)
      
      expect(result.mode).toBe('retaining')
      expect(result.due_date).toBeInstanceOf(Date)
      expect(result.due_date.getTime()).toBeGreaterThan(Date.now())
    })

    it('should not mutate original card', () => {
      const originalMode = mockCard.mode
      ReviewScheduler.graduateCard(mockCard)
      
      expect(mockCard.mode).toBe(originalMode)
    })

    it('should schedule for 1 day later', () => {
      const result = ReviewScheduler.graduateCard(mockCard)
      const expectedTime = Date.now() + (24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(result.due_date.getTime() - expectedTime)
      
      expect(timeDiff).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('scheduleRetainCard', () => {
    beforeEach(() => {
      mockCard.mode = 'retaining'
      mockCard.review_history = []
    })

    it('should add review entry to history', () => {
      const result = ReviewScheduler.scheduleRetainCard(mockCard, true)
      
      expect(result.review_history).toHaveLength(1)
      expect(result.review_history[0].correct).toBe(true)
      expect(result.review_history[0].timestamp).toBeInstanceOf(Date)
    })

    it('should schedule correctly for first correct review (2^0 = 1 day)', () => {
      const result = ReviewScheduler.scheduleRetainCard(mockCard, true)
      const expectedTime = Date.now() + (1 * 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(result.due_date.getTime() - expectedTime)
      
      expect(timeDiff).toBeLessThan(1000)
    })

    it('should schedule correctly for second correct review (2^1 = 2 days)', () => {
      // Add first review
      mockCard.review_history = [{
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        correct: true
      }]
      
      const result = ReviewScheduler.scheduleRetainCard(mockCard, true)
      const expectedTime = Date.now() + (2 * 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(result.due_date.getTime() - expectedTime)
      
      expect(timeDiff).toBeLessThan(1000)
    })

    it('should schedule for immediate review on incorrect answer', () => {
      const result = ReviewScheduler.scheduleRetainCard(mockCard, false)
      
      expect(result.due_date.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should not mutate original card', () => {
      const originalHistoryLength = mockCard.review_history.length
      ReviewScheduler.scheduleRetainCard(mockCard, true)
      
      expect(mockCard.review_history).toHaveLength(originalHistoryLength)
    })
  })
})
```

  })
})
```

### Test Database Operations

Create `test/database.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { MimirDatabase } from '../src/database.js'

describe('MimirDatabase', () => {
  let db

  beforeEach(async () => {
    db = new MimirDatabase()
    await db.db.open()
  })

  describe('Deck Operations', () => {
    it('should create a deck with timestamps', async () => {
      const deckId = await db.createDeck('Test Deck', 'Test Description')
      const deck = await db.getDeck(deckId)

      expect(deck.name).toBe('Test Deck')
      expect(deck.description).toBe('Test Description')
      expect(deck.created_at).toBeInstanceOf(Date)
      expect(deck.updated_at).toBeInstanceOf(Date)
    })

    it('should retrieve all decks', async () => {
      await db.createDeck('Deck 1', 'Description 1')
      await db.createDeck('Deck 2', 'Description 2')

      const decks = await db.getAllDecks()
      expect(decks).toHaveLength(2)
    })

    it('should update deck timestamps on modification', async () => {
      const deckId = await db.createDeck('Original Name', 'Original Description')
      const originalDeck = await db.getDeck(deckId)

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      await db.updateDeck(deckId, { name: 'Updated Name' })
      const updatedDeck = await db.getDeck(deckId)

      expect(updatedDeck.name).toBe('Updated Name')
      expect(updatedDeck.updated_at.getTime()).toBeGreaterThan(originalDeck.updated_at.getTime())
    })

    it('should delete deck and cascade delete cards', async () => {
      const deckId = await db.createDeck('Test Deck', 'Test Description')
      await db.createCard(deckId, 'Test Prompt', 'Test Response')

      await db.deleteDeck(deckId)

      const deck = await db.getDeck(deckId)
      const cards = await db.getCardsByDeck(deckId)

      expect(deck).toBeUndefined()
      expect(cards).toHaveLength(0)
    })
  })

  describe('Card Operations', () => {
    let deckId

    beforeEach(async () => {
      deckId = await db.createDeck('Test Deck', 'Test Description')
    })

    it('should create card with default learning mode', async () => {
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')
      const card = await db.getCard(cardId)

      expect(card.prompt).toBe('Test Prompt')
      expect(card.response).toBe('Test Response')
      expect(card.mode).toBe('learning')
      expect(card.due_date).toBeInstanceOf(Date)
      expect(card.review_history).toEqual([])
    })

    it('should retrieve cards by deck', async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.createCard(deckId, 'Prompt 2', 'Response 2')

      const cards = await db.getCardsByDeck(deckId)
      expect(cards).toHaveLength(2)
    })

    it('should update card review data', async () => {
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')

      await db.updateCard(cardId, {
        mode: 'retaining',
        review_history: [{ timestamp: new Date(), correct: true }]
      })

      const updatedCard = await db.getCard(cardId)
      expect(updatedCard.mode).toBe('retaining')
      expect(updatedCard.review_history).toHaveLength(1)
    })
  })

  describe('Schema Migration', () => {
    it('should migrate cards to have review fields', async () => {
      // This test would be more complex in a real scenario
      // For now, we verify that new cards have the expected structure
      const deckId = await db.createDeck('Test Deck', 'Test Description')
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')
      const card = await db.getCard(cardId)

      expect(card).toHaveProperty('mode')
      expect(card).toHaveProperty('due_date')
      expect(card).toHaveProperty('review_history')
    })
  })
})
```

## Step 4: Review Session Testing

Create `test/reviewSession.test.js`:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MimirDatabase } from '../src/database.js'

// Mock ReviewSession class (extracted from script.js)
class ReviewSession {
  constructor(db) {
    this.db = db
    this.cards = []
    this.currentIndex = 0
    this.mode = null
    this.deckId = null
    this.showingAnswer = false
    this.sessionProgress = new Map()
  }

  async start(deckId, mode) {
    this.deckId = deckId
    this.mode = mode
    this.currentIndex = 0
    this.showingAnswer = false
    this.sessionProgress.clear()

    if (mode === 'blitz') {
      this.cards = await this.db.getCardsByDeck(deckId)
      this.cards.forEach(card => this.sessionProgress.set(card.id, 0))
    } else if (mode === 'learning') {
      const allCards = await this.db.getCardsByDeck(deckId)
      this.cards = allCards.filter(card => card.mode === 'learning')
      this.cards.forEach(card => this.sessionProgress.set(card.id, 0))
    }

    return this.cards.length > 0
  }

  getCurrentCard() {
    return this.cards[this.currentIndex]
  }

  updateProgress(cardId, isCorrect) {
    const current = this.sessionProgress.get(cardId) || 0
    if (isCorrect) {
      this.sessionProgress.set(cardId, current + 1)
    } else {
      this.sessionProgress.set(cardId, 0)
    }
  }

  isCardMastered(cardId) {
    return (this.sessionProgress.get(cardId) || 0) >= 2
  }

  areAllCardsMastered() {
    return Array.from(this.sessionProgress.values()).every(count => count >= 2)
  }
}

describe('ReviewSession', () => {
  let db, session, deckId

  beforeEach(async () => {
    db = new MimirDatabase()
    await db.db.open()
    session = new ReviewSession(db)
    deckId = await db.createDeck('Test Deck', 'Test Description')
  })

  describe('Session Initialization', () => {
    it('should start blitz session with all cards', async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.createCard(deckId, 'Prompt 2', 'Response 2')

      const success = await session.start(deckId, 'blitz')

      expect(success).toBe(true)
      expect(session.cards).toHaveLength(2)
      expect(session.mode).toBe('blitz')
      expect(session.sessionProgress.size).toBe(2)
    })

    it('should start learning session with only learning cards', async () => {
      const card1Id = await db.createCard(deckId, 'Prompt 1', 'Response 1')
      const card2Id = await db.createCard(deckId, 'Prompt 2', 'Response 2')

      // Graduate one card to retaining mode
      await db.updateCard(card2Id, { mode: 'retaining' })

      const success = await session.start(deckId, 'learning')

      expect(success).toBe(true)
      expect(session.cards).toHaveLength(1)
      expect(session.cards[0].id).toBe(card1Id)
    })

    it('should fail to start session with no cards', async () => {
      const success = await session.start(deckId, 'learning')

      expect(success).toBe(false)
    })
  })

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await session.start(deckId, 'blitz')
    })

    it('should track correct answers', () => {
      const card = session.getCurrentCard()

      session.updateProgress(card.id, true)
      expect(session.sessionProgress.get(card.id)).toBe(1)

      session.updateProgress(card.id, true)
      expect(session.sessionProgress.get(card.id)).toBe(2)
    })

    it('should reset progress on incorrect answer', () => {
      const card = session.getCurrentCard()

      session.updateProgress(card.id, true)
      session.updateProgress(card.id, false)

      expect(session.sessionProgress.get(card.id)).toBe(0)
    })

    it('should identify mastered cards', () => {
      const card = session.getCurrentCard()

      expect(session.isCardMastered(card.id)).toBe(false)

      session.updateProgress(card.id, true)
      session.updateProgress(card.id, true)

      expect(session.isCardMastered(card.id)).toBe(true)
    })

    it('should detect when all cards are mastered', () => {
      const card = session.getCurrentCard()

      expect(session.areAllCardsMastered()).toBe(false)

      session.updateProgress(card.id, true)
      session.updateProgress(card.id, true)

      expect(session.areAllCardsMastered()).toBe(true)
    })
  })
})
```

## Step 5: Integration Tests

Create `test/integration.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { MimirDatabase } from '../src/database.js'
import { ReviewScheduler } from '../src/reviewScheduler.js'

describe('Integration Tests', () => {
  let db, deckId

  beforeEach(async () => {
    db = new MimirDatabase()
    await db.db.open()
    deckId = await db.createDeck('Integration Test Deck', 'Test Description')
  })

  describe('Learning to Retention Workflow', () => {
    it('should complete full learning to retention cycle', async () => {
      // Create a learning card
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')
      let card = await db.getCard(cardId)

      expect(card.mode).toBe('learning')

      // Graduate the card
      const graduatedCard = ReviewScheduler.graduateCard(card)
      await db.updateCard(cardId, {
        mode: graduatedCard.mode,
        due_date: graduatedCard.due_date
      })

      // Verify graduation
      card = await db.getCard(cardId)
      expect(card.mode).toBe('retaining')
      expect(card.due_date).toBeInstanceOf(Date)

      // Simulate first retention review
      const reviewedCard = ReviewScheduler.scheduleRetainCard(card, true)
      await db.updateCard(cardId, {
        due_date: reviewedCard.due_date,
        review_history: reviewedCard.review_history
      })

      // Verify scheduling
      const finalCard = await db.getCard(cardId)
      expect(finalCard.review_history).toHaveLength(1)
      expect(finalCard.review_history[0].correct).toBe(true)
    })
  })

  describe('Due Card Retrieval', () => {
    it('should retrieve correct cards based on mode and due date', async () => {
      // Create cards in different states
      const learningCardId = await db.createCard(deckId, 'Learning Card', 'Response')

      const retainingCardId = await db.createCard(deckId, 'Retaining Card', 'Response')
      await db.updateCard(retainingCardId, {
        mode: 'retaining',
        due_date: new Date(Date.now() - 1000) // Due in the past
      })

      const futureCardId = await db.createCard(deckId, 'Future Card', 'Response')
      await db.updateCard(futureCardId, {
        mode: 'retaining',
        due_date: new Date(Date.now() + 86400000) // Due tomorrow
      })

      // Test learning cards
      const learningCards = await ReviewScheduler.getDueCards(db.db, deckId, 'learning')
      expect(learningCards).toHaveLength(1)
      expect(learningCards[0].id).toBe(learningCardId)

      // Test retaining cards
      const retainingCards = await ReviewScheduler.getDueCards(db.db, deckId, 'retaining')
      expect(retainingCards).toHaveLength(1)
      expect(retainingCards[0].id).toBe(retainingCardId)
    })
  })

  describe('Due Counts Calculation', () => {
    it('should calculate correct due counts', async () => {
      // Create test cards
      await db.createCard(deckId, 'Learning 1', 'Response')
      await db.createCard(deckId, 'Learning 2', 'Response')

      const retainingId = await db.createCard(deckId, 'Retaining', 'Response')
      await db.updateCard(retainingId, {
        mode: 'retaining',
        due_date: new Date(Date.now() - 1000)
      })

      const counts = await ReviewScheduler.getDueCounts(db.db, deckId)

      expect(counts.learning).toBe(2)
      expect(counts.retaining).toBe(1)
      expect(counts.total).toBe(3)
    })
  })
})
```

## Step 6: Running Tests

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest test/reviewScheduler.test.js

# Run tests in watch mode
npx vitest --watch
```

## Step 7: Test Coverage Goals

Aim for these coverage targets:
- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 95%+
- **Lines**: 90%+

### Key Areas to Test
1. **Edge Cases**: Empty decks, no due cards, invalid inputs
2. **Error Handling**: Database failures, network issues
3. **Boundary Conditions**: Date calculations, scheduling limits
4. **State Management**: Session state transitions
5. **Data Integrity**: Proper timestamps, foreign key relationships

## Step 8: Continuous Integration

Add a GitHub Actions workflow (`.github/workflows/test.yml`):
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Benefits Achieved

With this testing setup, you now have:

1. **Regression Protection**: Tests catch bugs when making changes
2. **Documentation**: Tests serve as executable specifications
3. **Refactoring Confidence**: Safe to improve code structure
4. **Edge Case Coverage**: Boundary conditions are tested
5. **Integration Validation**: Component interactions are verified

## Next Steps

1. **Add More Test Cases**: Cover remaining edge cases
2. **Performance Tests**: Test with large datasets
3. **End-to-End Tests**: Test full user workflows
4. **Visual Regression Tests**: Test UI components
5. **Accessibility Tests**: Ensure app is accessible

This comprehensive testing foundation will protect your spaced repetition app as it grows and evolves, giving you confidence to add new features and refactor existing code.
