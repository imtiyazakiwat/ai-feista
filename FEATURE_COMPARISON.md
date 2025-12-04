# AI Fiesta - Complete UI/UX Specification

## Overview
AI Fiesta is a multi-model AI chat comparison platform that allows users to query multiple AI models simultaneously and compare their responses side by side.

---

## 1. Layout Structure

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────────────────────┐ │
│ │          │ │ Model Tabs Header                              │ │
│ │          │ ├────────────────────────────────────────────────┤ │
│ │ Sidebar  │ │                                                │ │
│ │ (260px)  │ │              Chat Area                         │ │
│ │          │ │         (with dotted grid bg)                  │ │
│ │          │ │                                                │ │
│ │          │ ├────────────────────────────────────────────────┤ │
│ │          │ │ Input Area                                     │ │
│ └──────────┘ └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Sidebar Components

### 2.1 Header
- Logo with green gradient background (32x32px rounded)
- "AI Fiesta" text
- Theme toggle button (sun/moon icon)

### 2.2 Search Bar
- Magnifying glass icon
- Placeholder: "Search"
- Full width, rounded corners (10px)

### 2.3 New Chat Button
- Edit/pencil icon + "New chat" text
- Border style, full width

### 2.4 Navigation Sections
Each section has:
- Icon + Label + Plus button (on hover) + Chevron

**Sections:**
- 👤 Avatars - AI persona presets
- 📁 Projects - Saved project contexts  
- 🎮 Games - Interactive AI games

### 2.5 Chat History
- Grouped by: Today, Yesterday, Previous dates
- Each item shows title, hover reveals edit/delete

### 2.6 Footer
- **Plan Section**: "Free Plan" card with usage bar
- **Upgrade Button**: "✨ Upgrade plan"
- **User Profile**: Avatar + Name + Collapse button

---

## 3. Model Tabs Header

### Tab Components
Each model tab contains:
1. Model logo (20x20px)
2. Model name with dropdown arrow
3. External link icon (opens model in new tab)
4. Toggle switch (on/off)

### Tab States
- Active: Full opacity, green toggle
- Inactive: 50% opacity, gray toggle
- Draggable for reordering

### Right Side
- Settings/grid icon button

---

## 4. Welcome Screen (Empty State)

### Layout (centered)
1. **Mode Toggle Pills** - at vertical center
   - "Multi-Chat" (green when active)
   - "Super Fiesta" (gradient when active)

2. **Input Area** - below mode pills
   - Plus (+) button - opens attachment menu
   - Text input: "Ask me anything..."
   - Microphone button
   - Send button (green)

3. **Quick Actions** - below input
   - "🌐 Web Search" pill
   - "🖼️ Generate Image" pill

4. **Explore Section** - at bottom
   - "Explore" header + "See more >" link
   - Horizontal scrollable avatar cards

### Dotted Grid Background
- Subtle dot pattern (20px spacing)
- Light gray dots on light theme
- Dark gray dots on dark theme

---

## 5. Plus Menu (Attachment Menu)

When clicking + button:
```
┌─────────────────────┐
│ 📎 Attach Files     │
├─────────────────────┤
│ Generate            │
│ 🖼️ Image            │
│ 📄 Document         │
│ 🌐 Web Search       │
│ 🔬 Deep Research  > │
└─────────────────────┘
```

---

## 6. Chat Response View

### Multi-Column Layout
- Each active model gets a column
- Columns are resizable (drag handle)
- Minimum width: 350px

### Column Structure
```
┌─────────────────────┐
│ [icon] Model Name   │ <- Header
├─────────────────────┤
│                     │
│ User message bubble │ <- Right aligned
│                     │
│ [icon] AI response  │ <- Left aligned
│ [copy][👍][👎][↻]   │ <- Action buttons
│                     │
└─────────────────────┘
```

### Message Actions
- Copy button
- Thumbs up (like)
- Thumbs down (dislike)
- Regenerate button

---

## 7. Color Scheme

### Light Theme (Default)
```css
--bg-sidebar: #fafafa
--bg-main: #ffffff
--bg-card: #f5f5f5
--text-primary: #1a1a1a
--text-secondary: #666666
--accent: #10b981 (green)
--dot-color: #d4d4d4
```

### Dark Theme
```css
--bg-sidebar: #141414
--bg-main: #0a0a0a
--bg-card: #1a1a1a
--text-primary: #ffffff
--text-secondary: #a0a0a0
--accent: #10b981 (green)
--dot-color: #333333
```

---

## 8. Special Modes

### Multi-Chat Mode (Default)
- Multiple model columns
- Parallel responses
- Side-by-side comparison

### Super Fiesta / Council Mode
- Single column view
- 3-stage LLM council process
- Purple accent color
- BETA badge

### Image Generation Mode
- Single column view
- Image model selector in header
- Generated image display
- Download/copy actions

---

## 9. Explore Avatars

Pre-configured AI personas:
1. **Albert Einstein** - Science & physics expert
2. **Career Coach** - Professional guidance
3. **Creative Writer** - Storytelling assistance
4. **Code Mentor** - Programming help

---

## 10. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Send message |
| Escape | Stop generating |
| Ctrl/Cmd + N | New chat |
| Ctrl/Cmd + K | Focus search |
| Ctrl/Cmd + E | Enhance prompt |
| Ctrl/Cmd + / | Focus input |

---

## 11. Responsive Breakpoints

- **Desktop**: > 1024px - Full layout
- **Tablet**: 768-1024px - Collapsible sidebar
- **Mobile**: < 768px - Overlay sidebar, single column

---

## 12. Animations

- Sidebar slide: 300ms ease
- Tab hover: 150ms
- Toggle switch: 300ms cubic-bezier
- Message appear: fade + slide (200ms)
- Skeleton shimmer: 1.5s infinite
