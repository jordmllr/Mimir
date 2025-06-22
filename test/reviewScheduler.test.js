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
      const originalDueDate = mockCard.due_date
      ReviewScheduler.graduateCard(mockCard)
      
      expect(mockCard.mode).toBe(originalMode)
      expect(mockCard.due_date).toBe(originalDueDate)
    })

    it('should schedule for 1 day later', () => {
      const result = ReviewScheduler.graduateCard(mockCard)
      const expectedTime = Date.now() + (24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(result.due_date.getTime() - expectedTime)
      
      expect(timeDiff).toBeLessThan(1000) // Within 1 second
    })

    it('should preserve all other card properties', () => {
      const result = ReviewScheduler.graduateCard(mockCard)
      
      expect(result.id).toBe(mockCard.id)
      expect(result.deck_id).toBe(mockCard.deck_id)
      expect(result.prompt).toBe(mockCard.prompt)
      expect(result.response).toBe(mockCard.response)
      expect(result.review_history).toBe(mockCard.review_history)
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

    it('should schedule correctly for third correct review (2^2 = 4 days)', () => {
      // Add two previous reviews
      mockCard.review_history = [
        { timestamp: new Date(Date.now() - 172800000), correct: true }, // 2 days ago
        { timestamp: new Date(Date.now() - 86400000), correct: true }   // 1 day ago
      ]
      
      const result = ReviewScheduler.scheduleRetainCard(mockCard, true)
      const expectedTime = Date.now() + (4 * 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(result.due_date.getTime() - expectedTime)
      
      expect(timeDiff).toBeLessThan(1000)
    })

    it('should schedule for immediate review on incorrect answer', () => {
      const result = ReviewScheduler.scheduleRetainCard(mockCard, false)
      
      expect(result.due_date.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should not mutate original card', () => {
      const originalHistoryLength = mockCard.review_history.length
      const originalDueDate = mockCard.due_date
      ReviewScheduler.scheduleRetainCard(mockCard, true)
      
      expect(mockCard.review_history).toHaveLength(originalHistoryLength)
      expect(mockCard.due_date).toBe(originalDueDate)
    })

    it('should handle mixed correct/incorrect reviews correctly', () => {
      // Add mixed review history
      mockCard.review_history = [
        { timestamp: new Date(Date.now() - 259200000), correct: true },  // 3 days ago
        { timestamp: new Date(Date.now() - 172800000), correct: false }, // 2 days ago
        { timestamp: new Date(Date.now() - 86400000), correct: true }    // 1 day ago
      ]
      
      const result = ReviewScheduler.scheduleRetainCard(mockCard, true)
      
      // Should count only correct reviews (2 previous + 1 current = 3 total)
      // So 2^(3-1) = 4 days
      const expectedTime = Date.now() + (4 * 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(result.due_date.getTime() - expectedTime)
      
      expect(timeDiff).toBeLessThan(1000)
      expect(result.review_history).toHaveLength(4)
    })

    it('should initialize review_history if undefined', () => {
      delete mockCard.review_history
      
      const result = ReviewScheduler.scheduleRetainCard(mockCard, true)
      
      expect(result.review_history).toHaveLength(1)
      expect(result.review_history[0].correct).toBe(true)
    })
  })
})
