import { describe, it, expect, beforeEach } from 'vitest'
import { MimirDatabase } from '../src/database.js'
import { ReviewScheduler } from '../src/reviewScheduler.js'
import { ReviewSession } from '../src/reviewSession.js'

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
      expect(card.review_history).toEqual([])
      
      // Graduate the card using ReviewScheduler
      const graduatedCard = ReviewScheduler.graduateCard(card)
      await db.updateCard(cardId, {
        mode: graduatedCard.mode,
        due_date: graduatedCard.due_date
      })
      
      // Verify graduation
      card = await db.getCard(cardId)
      expect(card.mode).toBe('retaining')
      expect(card.due_date).toBeInstanceOf(Date)
      expect(card.due_date.getTime()).toBeGreaterThan(Date.now())
      
      // Simulate first retention review (correct)
      const reviewedCard = ReviewScheduler.scheduleRetainCard(card, true)
      await db.updateCard(cardId, {
        due_date: reviewedCard.due_date,
        review_history: reviewedCard.review_history
      })
      
      // Verify scheduling
      const finalCard = await db.getCard(cardId)
      expect(finalCard.review_history).toHaveLength(1)
      expect(finalCard.review_history[0].correct).toBe(true)
      
      // Check that due date is scheduled for 1 day (2^0)
      const expectedTime = Date.now() + (1 * 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(finalCard.due_date.getTime() - expectedTime)
      expect(timeDiff).toBeLessThan(2000) // Within 2 seconds
    })

    it('should handle incorrect retention review', async () => {
      // Create and graduate a card
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')
      let card = await db.getCard(cardId)
      
      const graduatedCard = ReviewScheduler.graduateCard(card)
      await db.updateCard(cardId, {
        mode: graduatedCard.mode,
        due_date: graduatedCard.due_date
      })
      
      card = await db.getCard(cardId)
      
      // Simulate incorrect retention review
      const reviewedCard = ReviewScheduler.scheduleRetainCard(card, false)
      await db.updateCard(cardId, {
        due_date: reviewedCard.due_date,
        review_history: reviewedCard.review_history
      })
      
      // Verify immediate rescheduling
      const finalCard = await db.getCard(cardId)
      expect(finalCard.review_history).toHaveLength(1)
      expect(finalCard.review_history[0].correct).toBe(false)
      expect(finalCard.due_date.getTime()).toBeLessThanOrEqual(Date.now())
      expect(finalCard.mode).toBe('retaining') // Should stay in retention mode
    })

    it('should handle multiple correct reviews with exponential scheduling', async () => {
      // Create and graduate a card
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')
      let card = await db.getCard(cardId)
      
      const graduatedCard = ReviewScheduler.graduateCard(card)
      await db.updateCard(cardId, {
        mode: graduatedCard.mode,
        due_date: graduatedCard.due_date
      })
      
      card = await db.getCard(cardId)
      
      // First correct review (2^0 = 1 day)
      let reviewedCard = ReviewScheduler.scheduleRetainCard(card, true)
      await db.updateCard(cardId, {
        due_date: reviewedCard.due_date,
        review_history: reviewedCard.review_history
      })
      
      card = await db.getCard(cardId)
      
      // Second correct review (2^1 = 2 days)
      reviewedCard = ReviewScheduler.scheduleRetainCard(card, true)
      await db.updateCard(cardId, {
        due_date: reviewedCard.due_date,
        review_history: reviewedCard.review_history
      })
      
      card = await db.getCard(cardId)
      
      // Third correct review (2^2 = 4 days)
      reviewedCard = ReviewScheduler.scheduleRetainCard(card, true)
      await db.updateCard(cardId, {
        due_date: reviewedCard.due_date,
        review_history: reviewedCard.review_history
      })
      
      // Verify final state
      const finalCard = await db.getCard(cardId)
      expect(finalCard.review_history).toHaveLength(3)
      expect(finalCard.review_history.every(r => r.correct)).toBe(true)
      
      // Check that due date is scheduled for 4 days (2^2)
      const expectedTime = Date.now() + (4 * 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(finalCard.due_date.getTime() - expectedTime)
      expect(timeDiff).toBeLessThan(2000) // Within 2 seconds
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
      expect(learningCards[0].mode).toBe('learning')
      
      // Test retaining cards
      const retainingCards = await ReviewScheduler.getDueCards(db.db, deckId, 'retaining')
      expect(retainingCards).toHaveLength(1)
      expect(retainingCards[0].id).toBe(retainingCardId)
      expect(retainingCards[0].mode).toBe('retaining')
    })

    it('should return empty array when no cards are due', async () => {
      // Create cards that are not due
      const cardId = await db.createCard(deckId, 'Future Card', 'Response')
      await db.updateCard(cardId, {
        mode: 'retaining',
        due_date: new Date(Date.now() + 86400000) // Due tomorrow
      })
      
      const retainingCards = await ReviewScheduler.getDueCards(db.db, deckId, 'retaining')
      expect(retainingCards).toHaveLength(0)
      
      const learningCards = await ReviewScheduler.getDueCards(db.db, deckId, 'learning')
      expect(learningCards).toHaveLength(0)
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
      
      const futureId = await db.createCard(deckId, 'Future', 'Response')
      await db.updateCard(futureId, {
        mode: 'retaining',
        due_date: new Date(Date.now() + 86400000)
      })
      
      const counts = await ReviewScheduler.getDueCounts(db.db, deckId)
      
      expect(counts.learning).toBe(2)
      expect(counts.retaining).toBe(1)
      expect(counts.total).toBe(4)
    })

    it('should handle empty deck', async () => {
      const counts = await ReviewScheduler.getDueCounts(db.db, deckId)
      
      expect(counts.learning).toBe(0)
      expect(counts.retaining).toBe(0)
      expect(counts.total).toBe(0)
    })
  })

  describe('Review Session Integration', () => {
    it('should integrate with learning session workflow', async () => {
      // Create learning cards
      const card1Id = await db.createCard(deckId, 'Learning Card 1', 'Response 1')
      const card2Id = await db.createCard(deckId, 'Learning Card 2', 'Response 2')
      
      // Start learning session
      const session = new ReviewSession(db.db)
      const success = await session.start(deckId, 'learning')
      
      expect(success).toBe(true)
      expect(session.cards).toHaveLength(2)
      expect(session.mode).toBe('learning')
      
      // Simulate answering cards correctly
      const card1 = session.cards.find(c => c.id === card1Id)
      session.updateProgress(card1.id, true)
      session.updateProgress(card1.id, true)
      
      expect(session.isCardMastered(card1.id)).toBe(true)
      expect(session.areAllCardsMastered()).toBe(false)
      
      const card2 = session.cards.find(c => c.id === card2Id)
      session.updateProgress(card2.id, true)
      session.updateProgress(card2.id, true)
      
      expect(session.areAllCardsMastered()).toBe(true)
      expect(session.isSessionComplete()).toBe(true)
    })

    it('should integrate with retention session workflow', async () => {
      // Create and set up retention cards
      const card1Id = await db.createCard(deckId, 'Retention Card 1', 'Response 1')
      const card2Id = await db.createCard(deckId, 'Retention Card 2', 'Response 2')
      
      await db.updateCard(card1Id, {
        mode: 'retaining',
        due_date: new Date(Date.now() - 1000)
      })
      await db.updateCard(card2Id, {
        mode: 'retaining',
        due_date: new Date(Date.now() - 2000)
      })
      
      // Start retention session
      const session = new ReviewSession(db.db)
      const success = await session.start(deckId, 'retaining')
      
      expect(success).toBe(true)
      expect(session.cards).toHaveLength(2)
      expect(session.mode).toBe('retaining')
      
      // Simulate completing session
      session.currentIndex = session.cards.length
      
      expect(session.isSessionComplete()).toBe(true)
    })
  })

  describe('Cross-Component Data Flow', () => {
    it('should maintain data consistency across all components', async () => {
      // Create a card
      const cardId = await db.createCard(deckId, 'Integration Test', 'Test Response')
      
      // Verify initial state
      let card = await db.getCard(cardId)
      expect(card.mode).toBe('learning')
      expect(card.review_history).toEqual([])
      
      // Graduate using ReviewScheduler and make it due now
      const graduatedCard = ReviewScheduler.graduateCard(card)
      await db.updateCard(cardId, {
        mode: graduatedCard.mode,
        due_date: new Date(Date.now() - 1000) // Make it due in the past
      })

      // Verify database update
      card = await db.getCard(cardId)
      expect(card.mode).toBe('retaining')

      // Check that ReviewSession can find the card for retention
      const session = new ReviewSession(db.db)
      const success = await session.start(deckId, 'retaining')
      
      expect(success).toBe(true)
      expect(session.cards).toHaveLength(1)
      expect(session.cards[0].id).toBe(cardId)
      
      // Verify due counts reflect the change
      const counts = await ReviewScheduler.getDueCounts(db.db, deckId)
      expect(counts.learning).toBe(0)
      expect(counts.retaining).toBe(1)
      expect(counts.total).toBe(1)
    })
  })
})
