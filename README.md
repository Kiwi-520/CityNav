# 🚀 CityNav - Navigation App Prototype

A comprehensive PWA navigation application prototype with 18+ screens built using Material Design 3 principles.

![CityNav](https://img.shields.io/badge/CityNav-PWA%20Prototype-brightgreen) ![Status](https://img.shields.io/badge/Status-Ready%20for%20Testing-success) ![Screens](https://img.shields.io/badge/Screens-18%20MVP-blue)

## 📋 Table of Contents
- [Quick Start](#-quick-start)
- [Testing Guide](#-testing-guide)
- [App Flow Experience](#-app-flow-experience)
- [Project Structure](#-project-structure)
- [Development Setup](#-development-setup)
- [Contributing Guidelines](#-contributing-guidelines)
- [Screen Overview](#-screen-overview)

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Kiwi-520/CityNav.git
cd CityNav/prototype1
```

### 2. Start Local Server
```bash
# Using Python (recommended)
python -m http.server 1550

# Alternative using Node.js
npx serve -p 1550

# Alternative using PHP
php -S localhost:1550
```

### 3. Open in Browser
Navigate to: **http://localhost:1550**

---

## 🧪 Testing Guide

### **Screen Testing Suite**
Access the comprehensive screen testing dashboard:

```
🔗 URL: http://localhost:1550/screen-test.html
```

**Features:**
- ✅ Test all 18 MVP screens individually
- ✅ Quick navigation between screens
- ✅ Visual preview of each screen
- ✅ Status indicators for each component
- ✅ Direct links to individual screens

**Perfect for:**
- QA testing and validation
- Screen-by-screen review
- Individual component testing
- Design system verification

---

## 🎯 App Flow Experience

### **Complete User Journey**
Experience the full application flow:

```
🔗 URL: http://localhost:1550/citynav-app.html
```

**Complete User Flow:**
```
Welcome Screen → Feature Tour → Location Permission → 
City Selection → Setup Complete → Login → Home Dashboard → 
Search & Discovery → Place Details (static / no live POIs) → Route Planning → 
Turn-by-Turn Navigation → Feedback → Profile Settings
```

**Interactive Features:**
- ✅ **Authentication**: Social login, email validation, guest mode
- ✅ **Navigation**: Seamless screen transitions with state management
- ✅ **Search**: Place discovery with category filtering  
- ✅ **Route Planning**: Multi-route selection and navigation
- ✅ **User Feedback**: Star ratings, category selection, comments
- ✅ **Error Handling**: Graceful error recovery and user guidance

**Perfect for:**
- Stakeholder demonstrations
- User experience testing
- Complete workflow validation
- Team reviews and approvals

---

## 📁 Project Structure

```
prototype1/
├── 📄 citynav-app.html          # Main SPA application
├── 📄 screen-test.html          # Testing dashboard
├── 📄 index.html                # Design system showcase
├── 📁 screens/                  # Individual screen files (21 screens)
│   ├── welcome.html
│   ├── login.html
│   ├── home-dashboard.html
│   ├── poi-details.html
│   └── ... (18+ screens)
├── 📁 styles/                   # CSS architecture
│   ├── design-tokens.css        # Material Design 3 system
│   ├── base.css                 # Responsive foundation
│   └── components.css           # UI component library
└── 📁 scripts/                  # JavaScript utilities
    └── design-system.js
```

---

## 🛠 Development Setup

### **Prerequisites**
- **Git** (for version control)
- **Python 3.x** or **Node.js** (for local server)
- **Modern browser** (Chrome, Firefox, Safari, Edge)

### **Local Development**
1. **Clone and setup**:
   ```bash
   git clone https://github.com/Kiwi-520/CityNav.git
   cd CityNav/prototype1
   python -m http.server 1550
   ```

2. **Development workflow**:
   ```bash
   # Make changes to files
   # Test at http://localhost:1550/screen-test.html
   # Validate complete flow at http://localhost:1550/citynav-app.html
   ```

### **Technology Stack**
- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with custom properties, Grid, Flexbox
- **Vanilla JavaScript**: No external dependencies
- **Material Design 3**: Complete design system implementation
- **Progressive Web App**: Offline-ready architecture

---

## 🤝 Contributing Guidelines

### **Important: Never Push Directly to Main Branch**

All contributions must follow the branch-based workflow:

### **Step 1: Create a New Branch**
```bash
# Switch to main branch and pull latest changes
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name
# Example: git checkout -b feature/navigation-improvements
```

### **Step 2: Make Your Changes**
```bash
# Work on your changes
# Test thoroughly using screen-test.html and citynav-app.html
# Ensure all screens work properly
```

### **Step 3: Commit Your Changes**
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add navigation improvements to POI details screen"

# Use conventional commits:
# feat: new feature
# fix: bug fix
# docs: documentation changes
# style: formatting changes
# refactor: code refactoring
# test: adding tests
```

### **Step 4: Push Branch and Create Pull Request**
```bash
# Push your feature branch
git push origin feature/your-feature-name

# Go to GitHub and create a Pull Request
# 1. Navigate to https://github.com/Kiwi-520/CityNav
# 2. Click "Compare & pull request"
# 3. Fill in PR title and description
# 4. Request review from team members
```

### **Step 5: Pull Request Review Process**
1. **Code Review**: Team members review your changes
2. **Testing**: Verify functionality using test URLs
3. **Approval**: PR gets approved by maintainers
4. **Merge**: Changes are merged into main branch
5. **Cleanup**: Delete feature branch after merge

### **Branch Naming Conventions**
```bash
feature/your-feature-name    # New features
fix/bug-description         # Bug fixes
docs/documentation-update   # Documentation
refactor/component-name     # Code refactoring
```

### **Pull Request Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tested on screen-test.html
- [ ] Tested complete flow on citynav-app.html
- [ ] Verified responsive design
- [ ] Cross-browser testing completed

## Screenshots
(Add screenshots if applicable)
```

---

## 📱 Screen Overview

### **Complete MVP Implementation (18 Screens)**

| Category | Screen | Purpose | Status |
|----------|--------|---------|--------|
| **Onboarding** | Welcome | Language selection & intro | ✅ Complete |
| | Feature Tour | App capabilities showcase | ✅ Complete |
| | Location Permission | GPS access setup | ✅ Complete |
| | City Selection | Primary city configuration | ✅ Complete |
| | Setup Complete | Onboarding completion | ✅ Complete |
| **Authentication** | Login Screen | Social + email + guest login | ✅ Complete |
| **Core App** | Home Dashboard | Main hub with quick actions | ✅ Complete |
| | Interactive Map | Location-only map (live POI fetching removed) | ✅ Complete |
| | Search & Discovery | Place search with filters | ✅ Complete |
| | Nearby Places | Location-based listings (static/mock data; live Overpass POI fetching removed) | ✅ Complete |
| **Navigation** | POI Details | Business information & actions | ✅ Complete |
| | Route Options | Multi-route planning | ✅ Complete |
| | Turn-by-Turn Navigation | Live guidance interface | ✅ Complete |
| **User Account** | Profile & Settings | User preferences | ✅ Complete |
| **System** | Feedback Modal | Rating & review system | ✅ Complete |
| | Loading Screen | App initialization | ✅ Complete |
| | 404 Error Page | Error handling | ✅ Complete |
| | Privacy Policy | Legal compliance | ✅ Complete |

---

## 📞 Support & Contact

### **Testing Issues?**
1. Ensure local server is running on port 1550
2. Check browser console for any errors
3. Verify all CSS files are loading properly
4. Test both individual screens and complete app flow

### **Questions or Issues?**
- Create an issue on GitHub
- Follow the contributing guidelines above
- Test thoroughly before submitting PR

---

## 🎉 Ready for Testing!

### **Team Members & Stakeholders:**
- **Individual Screen Testing**: http://localhost:1550/screen-test.html
- **Complete App Experience**: http://localhost:1550/citynav-app.html

### **Developers:**
- Follow the contributing guidelines above
- Always create feature branches
- Test using both URLs before submitting PR
- Never push directly to main branch

**Happy Testing & Contributing! 🚀**

---

*Last Updated: August 28, 2025 | All 18 MVP screens complete and ready for comprehensive testing*

## 🎯 Overview

This prototype implements all the essential MVP screens as specified in your detailed wireframe requirements, featuring:

- **Responsive Design**: 1200×800 px desktop PWA base, centered content cards (max-width 600px)
- **Material Design 3**: Complete typography scale, color system, and component library
- **Accessibility**: WCAG 2.1 AA compliant with proper focus states and screen reader support
- **Interactive Components**: Fully functional buttons, forms, navigation, and state management
- **Offline-First**: Designed for PWA implementation with offline indicators and local storage

## 📁 Project Structure

```
prototype1/
├── index.html              # Design system documentation & component showcase
├── styles/
│   ├── design-tokens.css   # Color palette, typography, spacing, elevation
│   ├── components.css      # Button, input, card, navigation components
│   └── screens.css         # Screen-specific styles and layout
├── scripts/
│   └── design-system.js    # Interactive functionality and form validation
└── screens/
    ├── welcome.html           # Onboarding welcome screen
    ├── feature-tour.html      # Interactive feature tour
    ├── location-permission.html # Location access request
    ├── city-selection.html    # Manual/automatic city selection
    ├── setup-complete.html    # Setup completion with celebration
    └── home-dashboard.html    # Main dashboard with quick actions
```

## 🎨 Design System Features

### Color Palette
- **Primary**: #2E7D5E (Brand green for actions)
- **Primary Container**: #B8F2D9 (Active states, selected items)
- **Secondary**: #5D7C6B (Supporting text, secondary actions)
- **Surface**: #FDFDF7 (Background, cards)
- **Success**: #388E3C, **Warning**: #F9A825, **Error**: #BA1A1A

### Typography Scale (Inter Font)
- **Display Large**: 40px (Headlines like "Welcome to CityNav")
- **Display Medium**: 32px (Screen titles)
- **Headline Small**: 18px (Card titles)
- **Body Large**: 18px (Important descriptions)
- **Body Medium**: 16px (General text)
- **Label Large**: 14px (Button text)

### Components
- **Buttons**: Primary, secondary, outline, icon, emergency SOS
- **Inputs**: Text fields with icons, validation states
- **Cards**: Elevation-based with consistent 16px radius
- **Navigation**: Language selector, mode chips, bottom nav
- **Form Elements**: Toggle switches, dropdowns, search

## 🚀 Key Features Implemented

### 1. Onboarding Flow
- Welcome screen with language selection
- Interactive feature tour with carousel
- Location permission request with fallback
- City detection/manual selection
- Setup completion with celebratory animation

### 2. Dashboard
- Weather integration and city display
- Quick action buttons (Find, Route, Essentials)
- Daily tips with dismiss functionality
- Recent activity feed
- Emergency SOS button (3-second press)
- Safety alerts banner
- Bottom navigation

### 3. Interactive Elements
- **Ripple Effects**: Material Design button feedback
- **Form Validation**: Real-time email/password validation
- **State Management**: LocalStorage for user preferences
- **Responsive Navigation**: Mobile-friendly with hamburger menu
- **Loading States**: Spinners and progress indicators
- **Notifications**: Toast messages for user feedback

### 4. Accessibility
- **Keyboard Navigation**: Full keyboard support with focus indicators
- **Screen Reader**: Proper ARIA labels and semantic markup
- **Color Contrast**: WCAG 2.1 AA compliant color combinations
- **Touch Targets**: Minimum 48px interactive elements
- **Alternative Text**: Descriptive text for all icons

## 💻 Technical Implementation

### CSS Architecture
- **CSS Custom Properties**: Full design token system
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Mobile-First**: Responsive design starting from mobile
- **Component-Based**: Modular, reusable component styles

### JavaScript Features
- **ES6+ Modules**: Clean, modern JavaScript architecture
- **Event Handling**: Efficient event delegation
- **Local Storage**: Client-side state persistence
- **Web APIs**: Geolocation, vibration, audio context
- **Error Handling**: Graceful fallbacks for unsupported features

### Responsive Behavior
- **Desktop (1200px+)**: Centered cards with full features
- **Tablet (768px-1200px)**: Adapted layouts with touch optimization
- **Mobile (<768px)**: Full-width cards, stacked navigation, bottom tabs

## 🎯 Screen Specifications Met

All screens follow your exact requirements:

1. **Layout**: 1200×800 desktop PWA, 600px max-width cards
2. **Elevation**: 4dp main cards, 16dp modals, 2dp rest states
3. **Typography**: Complete Material Design 3 scale implementation
4. **Colors**: Exact hex values with proper semantic usage
5. **Components**: All specified interactive elements
6. **Responsive**: Full mobile adaptation with proper touch targets

## 🔧 Usage Instructions

### Local Development
1. Open `index.html` in a web browser
2. Navigate through the design system documentation
3. Test individual screens in the `/screens/` folder
4. Use browser dev tools to test responsive behavior

### Key Interactive Features
- **Language Selection**: Click language cards to switch
- **Form Validation**: Real-time validation on email/password fields
- **Emergency SOS**: Hold emergency button for 3 seconds
- **Navigation**: Use bottom nav or direct links between screens
- **State Persistence**: User selections saved in browser storage

## 🎨 Customization

### Design Tokens
All colors, spacing, and typography are defined in `design-tokens.css`:
```css
:root {
  --primary: #2E7D5E;
  --spacing-lg: 24px;
  --display-large-size: 40px;
}
```

### Component Modification
Individual components can be customized in `components.css` without affecting others.

### Screen-Specific Styling
Each screen has its own section in `screens.css` for unique layouts.

## 🚀 Next Steps

This prototype provides the foundation for:
1. **PWA Implementation**: Service worker integration for offline functionality
2. **API Integration**: Replace mock data with real backend services
3. **Advanced Features**: Push notifications, background sync, caching strategies
4. **User Testing**: A/B testing for different UI patterns
5. **Performance Optimization**: Code splitting, lazy loading, image optimization

## 📱 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: CSS Grid, Flexbox, Custom Properties, Geolocation API
- **Fallbacks**: Graceful degradation for unsupported features

---

**Built with modern web standards and following Material Design 3 principles for a consistent, accessible, and delightful user experience.**
