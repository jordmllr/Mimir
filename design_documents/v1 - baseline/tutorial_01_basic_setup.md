# Tutorial 01: Basic Project Setup

## Project Brief
Set up the foundation of Mimir v1 by creating the basic project structure and establishing core dependencies. This tutorial focuses on getting a minimal working environment ready for development - no functionality implementation, just the essential scaffolding.

## Learning Objectives
- Set up a minimal SPA structure with vanilla JS
- Configure local data persistence with Dexie/IndexedDB
- Establish development workflow and testing setup
- Understand fundamental project organization for offline-first web apps

## Scope for This Tutorial
**IN:** Project structure, dependency management, basic HTML skeleton, database connection setup
**OUT:** Any actual functionality, forms, CRUD operations, complex UI

## Step-by-Step Implementation

1. **Create the project directory structure:**
```bash
mkdir mimir
cd mimir
```

2. **Create basic project files:**
```bash
# Create .gitignore (optional, for future use)
echo "node_modules/" > .gitignore
```

Note: We're using CDN loading for Dexie instead of npm installation to keep the setup simple and avoid the need for a build process.

3. **Create `index.html`:**
```html:index.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mimir v1</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://unpkg.com/dexie@4.0.11/dist/dexie.js"></script>
</head>
<body>
    <div id="app">
        <header>
            <h1>Mimir v1</h1>
            <p>Learning Tool - Cards & Decks</p>
        </header>
        <main>
            <p id="status">App loaded successfully!</p>
        </main>
    </div>
    <script src="script.js"></script>
</body>
</html>
```

4. **Create `style.css`:**
```css:style.css
/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
}

#app {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background: white;
    min-height: 100vh;
}

header {
    text-align: center;
    padding-bottom: 20px;
    border-bottom: 2px solid #eee;
    margin-bottom: 20px;
}

header h1 {
    color: #2c3e50;
    margin-bottom: 5px;
}

header p {
    color: #7f8c8d;
    font-size: 0.9em;
}

#status {
    color: #28a745;
    font-weight: bold;
    text-align: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 5px;
}
```

5. **Create `script.js`:**
```javascript:script.js
// Mimir v1 - Basic Setup
console.log('Mimir v1 starting...');

// Test that Dexie loaded
if (typeof Dexie !== 'undefined') {
    console.log('Dexie loaded successfully');
    document.getElementById('status').textContent = 'Setup complete! Dexie ready for development.';
} else {
    console.error('Dexie failed to load');
    document.getElementById('status').textContent = 'Error: Dexie library not loaded';
    document.getElementById('status').style.color = '#dc3545';
}

// Basic app initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setup verified');
});
```

## How to Test

1. **Start a local development server:**
Since we're using CDN loading, you can use any simple HTTP server:

**Option 1 - Python (if you have Python installed):**
```bash
python -m http.server 8000
```

**Option 2 - Node.js (if you have Node.js installed):**
```bash
npx http-server -p 8000
```

**Option 3 - VS Code Live Server extension:**
Right-click on index.html and select "Open with Live Server"

2. **Open your browser and navigate to:**
   - `http://localhost:8000` (Python or http-server)
   - Whatever URL your development server shows

3. **Verify everything works:**
   - [ ] Page loads without errors
   - [ ] You see "Mimir v1" as the title
   - [ ] Status message shows "Setup complete! Dexie ready for development."
   - [ ] Open browser dev tools (F12) and check Console
   - [ ] Should see: "Mimir v1 starting..." and "Dexie loaded successfully"
   - [ ] No error messages in console

4. **Test the styling:**
   - [ ] Page should be centered with white background
   - [ ] Text should be readable with good contrast
   - [ ] Layout should look clean and minimal

## Learning Notes

**What We Accomplished:**
- Created a proper project structure that can scale
- Set up a development workflow with local server testing
- Established the foundation for a single-page application
- Integrated our first external library (Dexie) properly
- Created a basic error detection system

**Why We Did It This Way:**

1. **CDN Loading:** Using unpkg.com CDN for Dexie eliminates the need for npm/build tools and makes the setup simpler. The specific version (4.0.11) ensures consistency.

2. **File Structure:** Separating CSS, JS, and libraries keeps code organized and makes it easier to find things as the project grows.

3. **Local Server:** Even though it's just static files, using a local server prevents CORS issues when we start loading external resources and simulates how the app will work when deployed.

4. **Dexie Integration:** Loading it in the `<head>` ensures it's available when our script runs. The console logging gives us immediate feedback.

5. **Semantic HTML:** Using `<header>`, `<main>`, and proper structure makes the code more readable and accessible.

6. **CSS Reset:** The `* { box-sizing: border-box }` and margin/padding reset prevents unexpected layout issues across different browsers.

**Key Concepts Introduced:**
- **Single Page Application (SPA) structure:** One HTML file that we'll enhance with JavaScript
- **Progressive Enhancement:** Start with working HTML, add functionality incrementally
- **Local Development Workflow:** Test locally, then deploy
- **Dependency Management:** Loading and verifying external libraries

### Project Structure After Step 1
```
mimir/
├── .gitignore
├── index.html
├── style.css
└── script.js
```

This approach prioritizes simplicity and quick setup while still following modern web development practices!

**Next Step Preview:** In Step 2, we'll add the basic HTML structure and styling, building on this solid foundation.

## Success Criteria
By the end of this tutorial, you should have:
- ✅ A minimal HTML page that loads without errors
- ✅ Dexie library properly integrated and verified
- ✅ A local development server running
- ✅ Clean, semantic HTML structure ready for enhancement
- ✅ Basic CSS styling that looks professional
- ✅ Console logging that confirms everything is working

## Next Tutorial Preview
Tutorial 02 will add the card and deck creation functionality, building on the solid foundation you create here. We'll implement forms, database operations, and basic CRUD functionality.

## Questions to Consider for Future Development

1. **Data Model:** Should cards belong to exactly one deck, or multiple decks?
2. **UX Flow:** Create deck first, then cards? Or allow creating cards without decks?
3. **Validation:** What happens if user tries to create duplicate deck names?
4. **Storage:** How do we handle data migration if we change the schema later?