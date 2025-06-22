# Mimir V2 - UI/UX Improvements - Delight Users
The baseline version of Mimir has all the functionality you want from an SRS. Now, we want to focus on how the user flows through that functionality.

## Goals
### 1. Desktop UI/UX
Create a base mimir deck in json that contains all the cards needed to learn the mimir system. 
The base user screen is the deck overview screen. It is populated with details about the last used deck. If the user is new, the default deck is the mimir intro deck. 

The deck overview screen has buttons for launching learning, retention, and blitz review sessions. It also has a for creating new cards (maybe call this a deck-building session).

On desktop, the list of all decks is on the left side of the screen. Users can rearrange the hierarchy of the decks using a drag and drop indented/nested list interface. 

### 2. Mobile UI/UX
The mobile UI/UX is a bit more complex. We want to use the same core functionality, but the screen real estate is limited. Whereas the deck list is visible on the desktop, we need a button on mobile to slide the deck list pane into view.

### 3. User Accounts and Cloud Sync
Use dexie cloud functionality (free version only at this point) to sync changes so users have consistent decks across devices and a cloud backup in case they lose their device or clear the browser cache.