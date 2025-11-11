# SharedLM Landing Page

A CRED-inspired landing page for SharedLM, featuring a sleek black design with smooth animations and premium aesthetics.

## Features

- **CRED-Inspired Design**: Black background with transparent overlays and smooth transitions
- **Responsive Layout**: Fully responsive design that works on all devices
- **Smooth Animations**: CSS-based animations for optimal performance
- **Modern React**: Built with React 19 and modern best practices

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
cd apps/landing
npm install
```

### Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Project Structure

```
apps/landing/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── Header.css
│   │   ├── Hero.js
│   │   ├── Hero.css
│   │   ├── Features.js
│   │   ├── Features.css
│   │   ├── UseCases.js
│   │   ├── UseCases.css
│   │   ├── Trust.js
│   │   ├── Trust.css
│   │   ├── Footer.js
│   │   └── Footer.css
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── style.md
├── package.json
└── README.md
```

## Design System

See `style.md` for detailed design specifications and guidelines.

## Sections

1. **Header**: Fixed navigation with smooth scroll behavior
2. **Hero**: Main landing section with call-to-action
3. **Features**: Showcase of key product features
4. **Use Cases**: Real-world application examples
5. **Trust**: Security and reliability information
6. **Footer**: Links and company information

## Customization

- Update content in component files
- Modify colors and styles in CSS files
- Adjust breakpoints in component CSS files
- Add new sections by creating new components

