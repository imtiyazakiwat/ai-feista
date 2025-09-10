// Theme Management
class ThemeManager {
  constructor() {
    this.currentTheme = "light"
    this.init()
  }

  init() {
    // Load saved theme or detect system preference
    const savedTheme = window.Utils.storage.get("theme")
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

    this.currentTheme = savedTheme || systemTheme
    this.applyTheme(this.currentTheme)

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!window.Utils.storage.get("theme")) {
        this.setTheme(e.matches ? "dark" : "light")
      }
    })

    // Setup theme toggle button
    this.setupThemeToggle()
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById("themeToggle")
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        this.toggleTheme()
      })

      this.updateThemeToggleIcon()
    }
  }

  setTheme(theme) {
    this.currentTheme = theme
    this.applyTheme(theme)
    window.Utils.storage.set("theme", theme)
    this.updateThemeToggleIcon()

    // Emit theme change event
    window.Utils.eventEmitter.emit("themeChanged", theme)
  }

  applyTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/, "")
    document.body.classList.add(`theme-${theme}`)

    // Update meta theme-color for mobile browsers
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta")
      metaThemeColor.name = "theme-color"
      document.head.appendChild(metaThemeColor)
    }

    metaThemeColor.content = theme === "dark" ? "#0F172A" : "#F8FAFC"
  }

  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light"
    this.setTheme(newTheme)
  }

  updateThemeToggleIcon() {
    const themeToggle = document.getElementById("themeToggle")
    const themeIcon = themeToggle?.querySelector(".theme-icon")

    if (themeIcon) {
      themeIcon.textContent = this.currentTheme === "light" ? "🌙" : "☀️"
    }
  }

  getCurrentTheme() {
    return this.currentTheme
  }

  // Get theme-aware colors
  getThemeColors() {
    const colors = {
      light: {
        primary: "#6366F1",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        text: "#0F172A",
        textSecondary: "#64748B",
        border: "#E2E8F0",
      },
      dark: {
        primary: "#6366F1",
        background: "#0F172A",
        surface: "#334155",
        text: "#F8FAFC",
        textSecondary: "#CBD5E1",
        border: "#334155",
      },
    }

    return colors[this.currentTheme]
  }
}

// Initialize theme manager
window.themeManager = new ThemeManager()
