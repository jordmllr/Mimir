import { describe, it, expect, beforeEach } from 'vitest'
import { MimirDatabase } from '../src/database.js'
import { ReviewSession } from '../src/reviewSession.js'

describe('ReviewSession', () => {
  let db, session, deckId

  beforeEach(async () => {
    db = new MimirDatabase()
    await db.db.open()
    session = new ReviewSession(db.db)
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
      expect(session.deckId).toBe(deckId)
      expect(session.sessionProgress.size).toBe(2)
      expect(session.currentIndex).toBe(0)
      expect(session.showingAnswer).toBe(false)
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
      expect(session.mode).toBe('learning')
      expect(session.sessionProgress.size).toBe(1)
    })

    it('should start retention session with due cards', async () => {
      const card1Id = await db.createCard(deckId, 'Prompt 1', 'Response 1')
      const card2Id = await db.createCard(deckId, 'Prompt 2', 'Response 2')
      
      // Set up cards for retention mode
      await db.updateCard(card1Id, { 
        mode: 'retaining', 
        due_date: new Date(Date.now() - 1000) // Due in the past
      })
      await db.updateCard(card2Id, { 
        mode: 'retaining', 
        due_date: new Date(Date.now() + 86400000) // Due tomorrow
      })
      
      const success = await session.start(deckId, 'retaining')
      
      expect(success).toBe(true)
      expect(session.cards).toHaveLength(1)
      expect(session.cards[0].id).toBe(card1Id)
      expect(session.mode).toBe('retaining')
    })

    it('should fail to start session with no cards', async () => {
      const success = await session.start(deckId, 'learning')
      
      expect(success).toBe(false)
      expect(session.cards).toHaveLength(0)
    })

    it('should fail to start learning session with no learning cards', async () => {
      const cardId = await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.updateCard(cardId, { mode: 'retaining' })
      
      const success = await session.start(deckId, 'learning')
      
      expect(success).toBe(false)
    })

    it('should fail to start retention session with no due cards', async () => {
      const cardId = await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.updateCard(cardId, { 
        mode: 'retaining', 
        due_date: new Date(Date.now() + 86400000) // Due tomorrow
      })
      
      const success = await session.start(deckId, 'retaining')
      
      expect(success).toBe(false)
    })
  })

  describe('Card Navigation', () => {
    beforeEach(async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.createCard(deckId, 'Prompt 2', 'Response 2')
      await session.start(deckId, 'blitz')
    })

    it('should get current card', () => {
      const currentCard = session.getCurrentCard()
      
      expect(currentCard).toBeDefined()
      expect(currentCard.prompt).toBeDefined()
      expect(currentCard.response).toBeDefined()
    })

    it('should return null when no more cards', () => {
      session.currentIndex = session.cards.length
      const currentCard = session.getCurrentCard()
      
      expect(currentCard).toBeNull()
    })

    it('should show answer', () => {
      session.showAnswer()
      
      expect(session.showingAnswer).toBe(true)
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

  describe('Session Completion', () => {
    it('should detect completion for blitz mode', async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await session.start(deckId, 'blitz')
      
      expect(session.isSessionComplete()).toBe(false)
      
      const card = session.getCurrentCard()
      session.updateProgress(card.id, true)
      session.updateProgress(card.id, true)
      
      expect(session.isSessionComplete()).toBe(true)
    })

    it('should detect completion for learning mode', async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await session.start(deckId, 'learning')
      
      expect(session.isSessionComplete()).toBe(false)
      
      const card = session.getCurrentCard()
      session.updateProgress(card.id, true)
      session.updateProgress(card.id, true)
      
      expect(session.isSessionComplete()).toBe(true)
    })

    it('should detect completion for retention mode', async () => {
      const cardId = await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.updateCard(cardId, { 
        mode: 'retaining', 
        due_date: new Date(Date.now() - 1000)
      })
      
      await session.start(deckId, 'retaining')
      
      expect(session.isSessionComplete()).toBe(false)
      
      session.currentIndex = session.cards.length
      
      expect(session.isSessionComplete()).toBe(true)
    })
  })

  describe('Session Statistics', () => {
    it('should provide stats for blitz mode', async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.createCard(deckId, 'Prompt 2', 'Response 2')
      await session.start(deckId, 'blitz')
      
      const card1 = session.cards[0]
      session.updateProgress(card1.id, true)
      session.updateProgress(card1.id, true)
      
      const stats = session.getSessionStats()
      
      expect(stats.completed).toBe(1)
      expect(stats.total).toBe(2)
    })

    it('should provide stats for retention mode', async () => {
      const cardId = await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.updateCard(cardId, { 
        mode: 'retaining', 
        due_date: new Date(Date.now() - 1000)
      })
      
      await session.start(deckId, 'retaining')
      session.currentIndex = 1
      
      const stats = session.getSessionStats()
      
      expect(stats.completed).toBe(1)
      expect(stats.total).toBe(1)
    })
  })

  describe('Card Shuffling', () => {
    it('should shuffle cards', async () => {
      // Create multiple cards to test shuffling
      for (let i = 0; i < 10; i++) {
        await db.createCard(deckId, `Prompt ${i}`, `Response ${i}`)
      }
      
      await session.start(deckId, 'blitz')
      const originalOrder = session.cards.map(c => c.id)
      
      session.shuffleCards()
      const shuffledOrder = session.cards.map(c => c.id)
      
      // It's possible (but unlikely) that shuffle produces same order
      // So we just check that all cards are still present
      expect(shuffledOrder).toHaveLength(originalOrder.length)
      expect(shuffledOrder.sort()).toEqual(originalOrder.sort())
    })
  })
})
