# AI Fiesta Features Implementation Plan

## Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| Web Search | ✅ Done | Uses Perplexity Sonar Pro Search, passes results to all models |
| Model Dropdowns | ✅ Done | Working in welcome screen and chat columns |
| Avatars | ✅ Done | Custom AI personas with system prompts |
| Projects | 🔲 Todo | Save/reuse prompts, custom system instructions |
| Games | 🔲 Todo | Interactive AI games |
| Explore | 🔲 Todo | Prompt library/templates |
| Deep Research | 🔲 Todo | Multi-step research with citations |
| Document Generation | 🔲 Todo | Generate structured documents |

---

## 1. Web Search ✅ COMPLETED

**What it does:**
- Toggle "Search" button in input area
- Uses Perplexity Sonar Pro Search to search the web
- Passes search results as context to all AI models
- Models respond using current web data

**Files modified:**
- `src/utils/api.js` - Added `sendToAllModelsWithSearch`, search functions
- `src/components/InputArea.jsx` - Added search toggle button
- `src/store/useStore.js` - Added `webSearchMode` state

---

## 2. Avatars ✅ COMPLETED

**What it does:**
- 12 pre-built avatars (historical figures, expert advisors, creative personas)
- Users can create custom avatars with their own system prompts
- Categories: Historical, Advisor, Creative, Technical, Wellness, Custom
- Active avatar badge shows in sidebar
- Avatar system prompt is injected into all AI conversations

**Pre-built Avatars:**
- Historical: Einstein, Socrates, Cleopatra
- Advisors: Career Coach, Fitness Trainer, Financial Advisor
- Creative: Creative Writer, Art Director
- Technical: Code Mentor, Data Scientist
- Wellness: Supportive Listener, Life Coach

**Files created/modified:**
- `src/data/avatars.js` (new - avatar data and categories)
- `src/components/AvatarModal.jsx` (new - create/edit modal + panel)
- `src/components/Sidebar.jsx` (integrated AvatarPanel)
- `src/store/useStore.js` (avatar state and actions)
- `src/utils/api.js` (inject avatar system prompt)
- `src/styles/index.css` (avatar styles)

---

## 3. Projects 🔲 TODO

**What it does in real AI Fiesta:**
- Save and reuse prompts for ongoing work
- Custom system instructions per project
- Organize chats by project context

**Implementation Plan:**
```
- Store: Add projects array, activeProject state
- Components:
  - ProjectModal.jsx - Create/edit projects
  - ProjectList.jsx - Show in sidebar
- Data structure:
  {
    id: string,
    name: string,
    description: string,
    systemInstructions: string,
    createdAt: timestamp
  }
- Associate chats with projects
- Filter chat history by project
```

**Files to create/modify:**
- `src/components/ProjectModal.jsx` (new)
- `src/components/Sidebar.jsx` (expand projects section)
- `src/store/useStore.js` (add project state)

---

## 4. Games 🔲 TODO

**What it does in real AI Fiesta:**
- Interactive AI games (trivia, word games, riddles)
- Pre-built game templates

**Implementation Plan:**
```
- Pre-defined game templates:
  - 20 Questions
  - Trivia Quiz
  - Word Association
  - Story Builder
  - Riddles
- Each game has specific system prompt and rules
- Start game → creates new chat with game context
```

**Files to create/modify:**
- `src/data/games.js` (new - game templates)
- `src/components/GamesList.jsx` (new)
- `src/components/Sidebar.jsx` (expand games section)

---

## 5. Explore 🔲 TODO

**What it does in real AI Fiesta:**
- Discover prompt templates (3000+ prompts in 25 categories)
- Browse by category: Coding, Writing, Research, Marketing, etc.
- One-click use prompts

**Implementation Plan:**
```
- Prompt library with categories:
  - Coding & Development
  - Writing & Content
  - Research & Analysis
  - Marketing & Business
  - Education & Learning
  - Creative & Fun
- Click prompt → fills input area
- Show as modal or dedicated section
```

**Files to create/modify:**
- `src/data/prompts.js` (new - prompt library)
- `src/components/ExploreModal.jsx` (new)
- `src/components/ChatArea.jsx` (update explore section)

---

## 6. Deep Research 🔲 TODO

**What it does in real AI Fiesta:**
- Multi-step research with citations
- Comprehensive analysis on topics
- Uses Perplexity's deep research capabilities

**Implementation Plan:**
```
- Trigger multi-step research flow:
  1. Stage 1: Gather sources (multiple searches)
  2. Stage 2: Analyze and synthesize
  3. Stage 3: Generate comprehensive report with citations
- Show progress and sources
- Use Perplexity sonar-deep-research model
```

**Files to create/modify:**
- `src/utils/deepResearchApi.js` (new)
- `src/components/DeepResearchResponse.jsx` (new)

---

## 7. Document Generation 🔲 TODO

**What it does:**
- Generate structured documents (reports, summaries, articles)
- Different from regular chat - formatted output
- Option to download as PDF/Markdown

**Implementation Plan:**
```
- Document types:
  - Report
  - Summary
  - Article
  - Email
  - Proposal
- Modal to select type and provide context
- Generate with proper formatting
- Download options
```

---

## Priority Order

1. **Avatars** - High value, fun feature
2. **Projects** - Organize work, high utility
3. **Explore** - Help users with prompts
4. **Games** - Fun, engagement
5. **Deep Research** - Complex but valuable
6. **Document Generation** - Nice to have

---

## Next Steps

Ready to implement **Avatars** feature. This includes:
1. Create avatar data structure in store
2. Build AvatarModal component for create/edit
3. Update Sidebar to show avatar list
4. Inject avatar system prompt into API calls
