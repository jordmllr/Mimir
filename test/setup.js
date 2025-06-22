import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'

// Mock Dexie globally - import it dynamically to avoid issues
let Dexie
try {
  const dexieModule = await import('dexie')
  Dexie = dexieModule.default
  global.Dexie = Dexie
} catch (error) {
  console.error('Failed to import Dexie:', error)
}

// Reset IndexedDB before each test
beforeEach(async () => {
  // Clear all databases
  try {
    const databases = await indexedDB.databases()
    await Promise.all(
      databases.map(db => {
        return new Promise((resolve, reject) => {
          const deleteReq = indexedDB.deleteDatabase(db.name)
          deleteReq.onsuccess = () => resolve()
          deleteReq.onerror = () => reject(deleteReq.error)
        })
      })
    )
  } catch (error) {
    // Some environments might not support databases() method
    console.warn('Could not clear databases:', error)
  }
})
