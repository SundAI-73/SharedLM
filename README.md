# SharedLM

A unified chat interface that enables seamless conversations across multiple LLMs with persistent shared memory. Built with a distinctive monochromatic design system featuring LED-style typography.

[![Frontend Deploy](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://shared-lm.vercel.app)
[![Backend Deploy](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://sharedlm.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

## Table of Contents

- [About The Project](#about-the-project)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Contributors](#contributors)
- [License](#license)
- [Contact](#contact)

## About The Project

SharedLM is a comprehensive multi-LLM chat interface that solves the problem of fragmented AI conversations. Instead of switching between different AI platforms, SharedLM provides a unified interface where you can seamlessly switch between OpenAI, Anthropic, Mistral, and custom LLM providers while maintaining persistent memory across all conversations.

### Key Benefits

- **Unified Interface**: One platform for all your AI conversations
- **Persistent Memory**: Conversations persist across different AI models
- **Context Awareness**: Each AI model can access and build upon previous conversations
- **Flexible Integration**: Add custom LLM providers with compatible APIs
- **Secure Storage**: API keys encrypted at rest with industry-standard encryption
- **Cross-Platform**: Web application and desktop application for Windows, macOS, and Linux

## Built With

This section should list any major frameworks/libraries used to bootstrap your project. Leave any add-ons/plugins for the acknowledgements section. Here are a few examples.

- [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
- [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
- [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
- [![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
- [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
- [![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)

[(back to top)](#sharedlm)

## Getting Started

### Prerequisites

- Node.js 18+ and npm 10+
- Python 3.11+
- Git for version control

### Required API Keys

- [OpenAI API Key](https://platform.openai.com/api-keys)
- [Anthropic API Key](https://console.anthropic.com/)
- [Mistral API Key](https://console.mistral.ai/) (optional)
- [Mem0 API Key](https://app.mem0.ai/) (optional, but recommended for memory features)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/sharedlm.git
   cd sharedlm
   ```

2. Install all dependencies
   ```bash
   npm run install:all
   ```

3. Set up backend
   ```bash
   cd apps/server
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Set up frontend
   ```bash
   cd apps/web
   npm install
   ```

5. Create environment files

   Backend (.env in apps/server):
   ```env
   DATABASE_URL=sqlite:///./sharedlm.db
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   MEM0_API_KEY=your_mem0_api_key
   ENCRYPTION_KEY=your_32_character_encryption_key
   ENVIRONMENT=development
   ```

   Frontend (.env.local in apps/web):
   ```env
   REACT_APP_API_URL=http://localhost:8000
   ```

6. Run database migrations
   ```bash
   cd packages/database/migration
   python init_sqlite_database.py
   ```

7. Start the backend server
   ```bash
   cd apps/server
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

8. Start the frontend development server
   ```bash
   cd apps/web
   npm start
   ```

The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:8000`. API documentation will be available at `http://localhost:8000/docs`.

## Configuration

### Environment Variables

#### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | Database connection string | Yes |
| OPENAI_API_KEY | OpenAI API key | No* |
| ANTHROPIC_API_KEY | Anthropic API key | No* |
| MEM0_API_KEY | Mem0 API key | No* |
| ENCRYPTION_KEY | 32-character encryption key | Yes |
| ENVIRONMENT | Environment (development/production) | No |

*API keys can be set globally or per-user via the UI. Per-user keys take precedence.

#### Frontend (.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| REACT_APP_API_URL | Backend API URL | Yes |

### Generating Encryption Key

```python
import secrets
encryption_key = secrets.token_urlsafe(32)
print(encryption_key)
```

## Usage

### Web Application

1. Start the backend and frontend servers (see Installation)
2. Open `http://localhost:3000` in your browser
3. Create an account or login
4. Add your API keys in the Integrations page
5. Start chatting with AI models
6. Organize conversations into projects

### Desktop Application

1. Build the desktop application
   ```bash
   cd apps/web
   npm run build:electron
   npm run electron
   ```

2. For production builds:
   ```bash
   # Windows
   npm run dist
   
   # macOS
   npm run dist -- --mac
   
   # Linux
   npm run dist -- --linux
   ```

## API Documentation

### Base URL

- Development: `http://localhost:8000`
- Production: `https://sharedlm.onrender.com`

### Interactive API Documentation

- Swagger UI: `https://sharedlm.onrender.com/docs`
- ReDoc: `https://sharedlm.onrender.com/redoc`

### Authentication

All API endpoints (except `/health` and `/auth/*`) require authentication via the `X-User-ID` header.

For detailed API documentation, please visit the interactive API documentation at `/docs` endpoint.

## Development

### Development Workflow in VS Code

**Recommended**: Use VS Code with the provided configuration for the best development experience.

#### Quick Start

1. **Open VS Code** in the project root
2. **Install Python extension** (if prompted)
3. **Select Python interpreter**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Python: Select Interpreter"
   - Choose your Python 3.11+ interpreter

#### Daily Workflow

1. **Build/Verify Solution**:
   - Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac)
   - This verifies all imports and dependencies

2. **View Tests in Test Explorer**:
   - Open Test Explorer panel (beaker icon in sidebar)
   - All tests auto-discover on save
   - See test results inline

3. **Run Tests**:
   - Click "Run All" button in Test Explorer
   - Or run specific test/file by clicking play icon
   - Or use task: `Ctrl+Shift+P` → "Tasks: Run Task" → "🧪 Run All Tests"

4. **Before Committing**:
   - Run build: `Ctrl+Shift+B`
   - Run all tests: Use Test Explorer or task
   - Only commit if everything passes ✅

#### VS Code Tasks

- `Ctrl+Shift+B` - **🔍 Verify Server Build** (default build task)
- `Ctrl+Shift+P` → "Tasks: Run Task" → **✅ Build & Test (Pre-Commit)** - Runs build + all tests
- `Ctrl+Shift+P` → "Tasks: Run Task" → **🧪 Run All Tests** - Run all tests
- `Ctrl+Shift+P` → "Tasks: Run Task" → **🧪 Run Tests with Coverage** - Run tests with coverage

See `.vscode/DEVELOPMENT.md` for detailed VS Code workflow guide.

### Development Workflow (Command Line)

1. Start Backend:
   ```bash
   cd apps/server
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

2. Start Frontend:
   ```bash
   cd apps/web
   npm install
   npm start
   ```

3. Run Both (from root):
   ```bash
   npm run dev:server  # Terminal 1
   npm run dev:web     # Terminal 2
   ```

### Testing

#### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
cd apps/server
PYTHONPATH=../.. python -m pytest ../../test/server/test_health.py -v
```

#### VS Code Test Explorer

- Tests are automatically discovered
- View all tests in Test Explorer panel
- Run tests with one click
- See results inline
- Debug tests directly from Test Explorer

### Code Style

- Python: Follow PEP 8, use type hints
- JavaScript: Follow ESLint rules, use modern ES6+ syntax
- CSS: Use consistent naming conventions

### Before Committing

1. **Build/Verify**: `Ctrl+Shift+B` (VS Code) or `npm run verify`
2. **Run Tests**: Use Test Explorer or `npm test`
3. **Check Results**: All tests should pass ✅
4. **Commit**: Only commit if everything passes

## Deployment

### Deploy Frontend to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd apps/web
   vercel
   ```

3. Set Environment Variables in Vercel dashboard:
   - `REACT_APP_API_URL`: `https://your-backend-url.onrender.com`

### Deploy Backend to Render

1. Create a new Web Service on [Render](https://render.com)

2. Connect your GitHub repository

3. Configure build settings:
   - Root Directory: `apps/server`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python3 -m uvicorn app:app --host 0.0.0.0 --port $PORT`

4. Add Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `MEM0_API_KEY`: Your Mem0 API key
   - `ENCRYPTION_KEY`: Your 32-character encryption key
   - `ENVIRONMENT`: `production`

5. Deploy: Render will automatically deploy on every push to main branch

### Deploy Desktop Application

1. Build for Windows:
   ```bash
   cd apps/web
   npm run dist
   ```

2. Build for macOS:
   ```bash
   npm run dist -- --mac
   ```

3. Build for Linux:
   ```bash
   npm run dist -- --linux
   ```

## Roadmap

- [x] User Authentication
- [x] API Key Management
- [x] Custom Integrations
- [x] Projects & Conversations
- [x] Desktop Application
- [ ] Additional LLM Support
  - [ ] Llama
  - [ ] Gemini
- [ ] Voice Input/Output
- [ ] Collaborative Chat Rooms
- [ ] Enhanced Analytics
- [ ] Mobile App
- [ ] Export Functionality
- [ ] Plugin System
- [ ] Multi-language Support
  - [ ] Chinese
  - [ ] Spanish
- [ ] Advanced Search
- [ ] Theme Customization

See the [open issues](https://github.com/yourusername/sharedlm/issues) for a full list of proposed features (and known issues).

[(back to top)](#sharedlm)

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

### Quick Start for Contributors

1. **Fork the Project**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/sharedlm.git
   cd sharedlm
   ```

3. **Setup Development Environment**:
   - Install dependencies: `npm run install:all`
   - Setup Python environment: See Installation section
   - Open in VS Code: Install recommended extensions

4. **Create Feature Branch**:
   ```bash
   git checkout -b feature/AmazingFeature
   ```

5. **Make Your Changes**:
   - Write code
   - Write tests
   - Update documentation

6. **Before Committing**:
   - **Build/Verify**: `Ctrl+Shift+B` (VS Code) or `npm run verify`
   - **Run Tests**: Use Test Explorer or `npm test`
   - **Check Results**: All tests must pass ✅
   - **Only commit if everything passes**

7. **Commit Your Changes**:
   ```bash
   git add .
   git commit -m 'Add some AmazingFeature'
   ```

8. **Push to Your Branch**:
   ```bash
   git push origin feature/AmazingFeature
   ```

9. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- **Always build and test before committing**
- Ensure all tests pass before opening PR

## Contributors

Thanks to all the people who contribute to SharedLM!

<!-- This will be automatically updated by GitHub -->
<a href="https://github.com/yourusername/sharedlm/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=yourusername/sharedlm" />
</a>

Made with [contributors-img](https://contrib.rocks).

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/sharedlm/issues)
- API Documentation: [Interactive API docs](https://sharedlm.onrender.com/docs)

## Acknowledgments

- [Mem0](https://mem0.ai/) for persistent memory
- [OpenAI](https://openai.com/) for GPT models
- [Anthropic](https://anthropic.com/) for Claude models
- [Mistral AI](https://mistral.ai/) for Mistral models

---

[Back to Top](#sharedlm)
