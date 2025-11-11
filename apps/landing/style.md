# CRED-Inspired Landing Page Design System

## Overview
This document outlines the design system and styling guidelines for building a CRED.club-inspired landing page. The design should feature a sleek, modern black aesthetic with smooth animations and premium feel.

## Core Design Principles

### Color Palette
- **Primary Background**: `rgb(0, 0, 0)` (Pure Black)
- **Theme Color**: `#000` (Black)
- **Theme Color Light**: `rgba(0, 0, 0, .04)` (Very subtle black overlay)
- **Text Color**: `#000` (Black) - Note: This may be overridden for contrast on black backgrounds
- **Tap Highlight**: Transparent (`-webkit-tap-highlight-color: transparent`)

### Typography
- **Primary Font**: `gilroy-regular`
- **Font Variant**: `font-variant-ligatures: none`
- **Text Selection**: Disabled (`user-select: none`)

## Global Styles

### HTML & Root
```css
html {
    scroll-behavior: smooth;
}

:root {
    --theme-color: #000 !important;
    --theme-color-light: rgba(0, 0, 0, .04) !important;
    --text-color: #000 !important;
    --100vh: 922px; /* Dynamic viewport height */
    -webkit-tap-highlight-color: transparent;
    view-transition-name: root;
}
```

### Body Styles
```css
body {
    /* Layout */
    display: block;
    margin: 0px;
    padding-right: 0px;
    padding-bottom: 0px;
    padding-left: 0px;
    padding-top: env(safe-area-inset-top);
    
    /* Visual */
    background-color: rgb(0, 0, 0);
    color: rgb(0, 0, 0);
    
    /* Typography */
    font-family: gilroy-regular;
    font-variant-ligatures: none;
    
    /* Sizing */
    min-height: var(--100vh, 100vh);
    max-height: -webkit-fill-available;
    width: 100vw;
    
    /* Behavior */
    overflow-x: hidden;
    overflow-y: scroll;
    position: relative;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    text-size-adjust: none;
    overscroll-behavior-y: none;
    
    /* Smooth scrolling */
    scroll-behavior: smooth;
}
```

### Universal Box Model
```css
* {
    box-sizing: border-box;
}
```

## Component Styles

### Navigation Header (`.eojfPz`)
```css
.eojfPz {
    display: flex;
    position: absolute;
    top: 0px;
    padding: 70px 130px;
    align-items: center;
    background-color: transparent;
    z-index: 11;
    justify-content: space-between;
    width: 100%;
    transition: top 0.5s;
}

/* Mobile Responsive */
@media (max-width: 890px) {
    .eojfPz {
        padding: 64px 40px 0px;
    }
}
```

**Key Features:**
- Absolute positioning at top
- High z-index (11) for overlay effect
- Smooth transition on top property (0.5s)
- Responsive padding adjustments
- Transparent background for overlay effect
- Space-between layout for logo and navigation

## Design Characteristics

### Visual Style
1. **Black Background**: Pure black (`rgb(0, 0, 0)`) creates a premium, sleek aesthetic
2. **Transparent Overlays**: Navigation and other elements use transparent backgrounds
3. **Smooth Transitions**: 0.5s transitions for position changes
4. **No Text Selection**: Prevents accidental text selection for cleaner UX

### Layout Principles
1. **Full Viewport Width**: `100vw` ensures full-width coverage
2. **Safe Area Support**: `env(safe-area-inset-top)` for mobile device compatibility
3. **Dynamic Viewport Height**: Uses CSS variable `--100vh` for accurate mobile viewport handling
4. **Overflow Control**: Horizontal overflow hidden, vertical scroll enabled

### Interaction Design
1. **Smooth Scrolling**: Enabled on HTML level
2. **No Tap Highlights**: Transparent tap highlights for cleaner mobile experience
3. **Overscroll Prevention**: Prevents bounce effect on mobile (`overscroll-behavior-y: none`)
4. **Text Size Adjustment**: Disabled for consistent rendering (`text-size-adjust: none`)

## Responsive Breakpoints

### Mobile
- **Breakpoint**: `max-width: 890px`
- **Navigation Padding**: Reduced from `70px 130px` to `64px 40px 0px`

## Implementation Notes

### Font Loading
- Ensure `gilroy-regular` font is loaded before rendering
- Consider fallback fonts for better compatibility

### Performance
- Use CSS transitions instead of JavaScript animations where possible
- Leverage `will-change` property for animated elements
- Consider using `transform` and `opacity` for GPU-accelerated animations

### Accessibility
- Ensure sufficient contrast for text on black backgrounds
- Consider adding focus states for keyboard navigation
- Test with screen readers

### Browser Compatibility
- `env(safe-area-inset-top)` requires iOS 11+ and modern browsers
- `-webkit-tap-highlight-color` for WebKit browsers
- `overscroll-behavior-y` for modern browsers

## Content Strategy (Claude-like Context)

While the design follows CRED's aesthetic, the content should be similar to Claude's landing page:
- Focus on AI capabilities and features
- Highlight use cases and benefits
- Include interactive demos or examples
- Emphasize trust, security, and reliability
- Showcase product capabilities with visual elements

## Next Steps

1. Set up project structure (React/Next.js recommended)
2. Implement base layout with navigation
3. Create hero section with CRED-style animations
4. Build feature sections with smooth scroll effects
5. Add interactive elements and micro-interactions
6. Implement responsive design for all breakpoints
7. Optimize for performance and accessibility

