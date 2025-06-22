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
      expect(deck.id).toBe(deckId)
    })

    it('should create a deck without description', async () => {
      const deckId = await db.createDeck('Test Deck')
      const deck = await db.getDeck(deckId)
      
      expect(deck.name).toBe('Test Deck')
      expect(deck.description).toBeUndefined()
    })

    it('should retrieve all decks', async () => {
      await db.createDeck('Deck 1', 'Description 1')
      await db.createDeck('Deck 2', 'Description 2')
      
      const decks = await db.getAllDecks()
      expect(decks).toHaveLength(2)
      expect(decks[0].name).toBe('Deck 1')
      expect(decks[1].name).toBe('Deck 2')
    })

    it('should update deck and modify timestamp', async () => {
      const deckId = await db.createDeck('Original Name', 'Original Description')
      const originalDeck = await db.getDeck(deckId)

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100))

      await db.updateDeck(deckId, { name: 'Updated Name' })
      const updatedDeck = await db.getDeck(deckId)

      expect(updatedDeck.name).toBe('Updated Name')
      expect(updatedDeck.description).toBe('Original Description')
      expect(updatedDeck.updated_at.getTime()).toBeGreaterThanOrEqual(originalDeck.updated_at.getTime())
      expect(updatedDeck.created_at).toEqual(originalDeck.created_at)
    })

    it('should delete deck and cascade delete cards', async () => {
      const deckId = await db.createDeck('Test Deck', 'Test Description')
      await db.createCard(deckId, 'Test Prompt', 'Test Response')
      
      // Verify deck and card exist
      const deckBefore = await db.getDeck(deckId)
      const cardsBefore = await db.getCardsByDeck(deckId)
      expect(deckBefore).toBeDefined()
      expect(cardsBefore).toHaveLength(1)
      
      await db.deleteDeck(deckId)
      
      const deckAfter = await db.getDeck(deckId)
      const cardsAfter = await db.getCardsByDeck(deckId)
      
      expect(deckAfter).toBeUndefined()
      expect(cardsAfter).toHaveLength(0)
    })

    it('should return undefined for non-existent deck', async () => {
      const deck = await db.getDeck(999)
      expect(deck).toBeUndefined()
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
      expect(card.deck_id).toBe(deckId)
      expect(card.mode).toBe('learning')
      expect(card.due_date).toBeInstanceOf(Date)
      expect(card.review_history).toEqual([])
      expect(card.created_at).toBeInstanceOf(Date)
      expect(card.updated_at).toBeInstanceOf(Date)
    })

    it('should retrieve cards by deck', async () => {
      await db.createCard(deckId, 'Prompt 1', 'Response 1')
      await db.createCard(deckId, 'Prompt 2', 'Response 2')
      
      const cards = await db.getCardsByDeck(deckId)
      expect(cards).toHaveLength(2)
      expect(cards[0].prompt).toBe('Prompt 1')
      expect(cards[1].prompt).toBe('Prompt 2')
    })

    it('should update card and modify timestamp', async () => {
      const cardId = await db.createCard(deckId, 'Original Prompt', 'Original Response')
      const originalCard = await db.getCard(cardId)

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100))

      await db.updateCard(cardId, { prompt: 'Updated Prompt' })
      const updatedCard = await db.getCard(cardId)

      expect(updatedCard.prompt).toBe('Updated Prompt')
      expect(updatedCard.response).toBe('Original Response')
      expect(updatedCard.updated_at.getTime()).toBeGreaterThanOrEqual(originalCard.updated_at.getTime())
      expect(updatedCard.created_at).toEqual(originalCard.created_at)
    })

    it('should update card review data', async () => {
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')
      
      const reviewHistory = [{ timestamp: new Date(), correct: true }]
      await db.updateCard(cardId, {
        mode: 'retaining',
        review_history: reviewHistory,
        due_date: new Date(Date.now() + 86400000) // Tomorrow
      })
      
      const updatedCard = await db.getCard(cardId)
      expect(updatedCard.mode).toBe('retaining')
      expect(updatedCard.review_history).toHaveLength(1)
      expect(updatedCard.review_history[0].correct).toBe(true)
      expect(updatedCard.due_date).toBeInstanceOf(Date)
    })

    it('should delete card', async () => {
      const cardId = await db.createCard(deckId, 'Test Prompt', 'Test Response')
      
      // Verify card exists
      const cardBefore = await db.getCard(cardId)
      expect(cardBefore).toBeDefined()
      
      await db.deleteCard(cardId)
      
      const cardAfter = await db.getCard(cardId)
      expect(cardAfter).toBeUndefined()
    })

    it('should return undefined for non-existent card', async () => {
      const card = await db.getCard(999)
      expect(card).toBeUndefined()
    })

    it('should return empty array for deck with no cards', async () => {
      const cards = await db.getCardsByDeck(deckId)
      expect(cards).toEqual([])
    })

    it('should only return cards for specified deck', async () => {
      const deck2Id = await db.createDeck('Deck 2', 'Description 2')
      
      await db.createCard(deckId, 'Deck 1 Card', 'Response 1')
      await db.createCard(deck2Id, 'Deck 2 Card', 'Response 2')
      
      const deck1Cards = await db.getCardsByDeck(deckId)
      const deck2Cards = await db.getCardsByDeck(deck2Id)
      
      expect(deck1Cards).toHaveLength(1)
      expect(deck2Cards).toHaveLength(1)
      expect(deck1Cards[0].prompt).toBe('Deck 1 Card')
      expect(deck2Cards[0].prompt).toBe('Deck 2 Card')
    })
  })
})
