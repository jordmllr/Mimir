# 📚 Mimir Public Learning Decks

This folder contains curated flashcard decks that anyone can import into their Mimir app for learning common subjects.

## 🚀 Available Decks

### 1. Git Commands Essentials (`git_commands.json`)
**95 cards** covering essential Git version control commands

**What you'll learn:**
- Basic Git operations (init, clone, add, commit, status)
- Branching and merging (branch, checkout, merge, rebase)
- Remote repository operations (push, pull, fetch, remote)
- History and inspection (log, diff, blame, show)
- Advanced features (stash, cherry-pick, reflog, tags)
- Configuration and aliases
- Troubleshooting and maintenance

**Perfect for:** Developers learning Git, bootcamp students, anyone working with version control

**Tags:** `git`, `programming`, `version-control`, `developer-tools`

**Import URL:** `http://localhost:8000/import-git-deck.html`

---

## 📋 Deck Format

Each deck follows this JSON structure:

```json
{
  "deck_name": "Deck Title",
  "description": "Brief description of what this deck teaches",
  "category": "Subject Category",
  "difficulty": "Beginner/Intermediate/Advanced",
  "cards": [
    {
      "prompt": "Question or task to accomplish",
      "response": "Answer or command to execute",
      "tags": ["tag1", "tag2", "category", "difficulty"]
    }
  ]
}
```

## 🎯 How to Use

1. **Start your Mimir server:**
   ```bash
   cd path/to/mimir
   python -m http.server 8000
   ```

2. **Import a deck:**
   - Visit the specific import page for the deck you want
   - Click the import button
   - Wait for confirmation

3. **Start learning:**
   - Go to the Manage page
   - Find your imported deck
   - Click "Learn" to start a learning session

## 🛠️ Creating Your Own Decks

Want to contribute a deck? Follow these guidelines:

### Content Guidelines
- **Clear prompts:** Frame as tasks or questions the learner needs to accomplish
- **Accurate responses:** Provide exact commands, answers, or explanations
- **Consistent difficulty:** Keep cards within the same skill level
- **Good tagging:** Use relevant, searchable tags
- **Reasonable size:** 20-100 cards per deck (optimal for learning sessions)

### Technical Requirements
- Valid JSON format
- UTF-8 encoding
- Unique card prompts within the deck
- Meaningful tags for filtering and organization

### Suggested Deck Ideas
- **Programming Languages:** Python basics, JavaScript ES6, SQL queries
- **Frameworks:** React hooks, Vue.js directives, Express.js routes
- **Tools:** Docker commands, AWS CLI, Kubernetes kubectl
- **Languages:** Spanish verbs, French vocabulary, German articles
- **Sciences:** Chemistry formulas, Physics equations, Biology terms
- **Math:** Algebra rules, Calculus derivatives, Statistics formulas
- **History:** World War dates, Ancient civilizations, US Presidents
- **Geography:** Country capitals, US states, World landmarks

## 📁 File Naming Convention

Use descriptive, lowercase names with underscores:
- `git_commands.json` ✅
- `python_basics.json` ✅
- `spanish_verbs.json` ✅
- `react_hooks.json` ✅

## 🤝 Contributing

To add a new deck:

1. Create your JSON file following the format above
2. Test it thoroughly with the Mimir app
3. Add an entry to this README
4. Create an import page (optional but recommended)
5. Submit your contribution

## 📊 Deck Statistics

| Deck | Cards | Category | Difficulty | Tags |
|------|-------|----------|------------|------|
| Git Commands | 95 | Programming | Beginner-Intermediate | git, programming, version-control |

---

**Happy Learning! 🧠✨**

*These decks are designed to work with the Mimir spaced repetition flashcard system, helping you learn and retain knowledge effectively through active recall and spaced practice.*
