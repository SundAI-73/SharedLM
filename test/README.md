# Test Suite

This directory contains all test cases for the SharedLM project, including server API tests, service tests, utility tests, and database tests.

## Structure

```
test/
├── server/                    # Server (FastAPI) tests
│   ├── conftest.py           # Pytest fixtures and configuration
│   ├── test_health.py        # Health endpoint tests
│   ├── test_auth.py          # Authentication tests
│   ├── test_projects.py      # Projects endpoint tests
│   ├── test_conversations.py # Conversations endpoint tests
│   ├── test_api_keys.py      # API keys endpoint tests
│   ├── test_custom_integrations.py # Custom integrations endpoint tests
│   ├── test_chat.py          # Chat endpoint tests
│   ├── test_file_upload.py   # File upload endpoint tests
│   ├── services/             # Service layer tests
│   │   ├── test_llm_router.py # LLM router service tests
│   │   └── test_mem0_client.py # Mem0 client service tests
│   ├── utils/                # Utility tests
│   │   ├── test_encryption.py # Encryption utility tests
│   │   ├── test_security.py   # Security utility tests
│   │   ├── test_cache.py      # Cache utility tests
│   │   ├── test_prompt.py     # Prompt utility tests
│   │   └── test_api_key_validation.py # API key validation tests
│   └── database/             # Database operation tests
│       └── test_crud.py      # CRUD operation tests
├── fixtures/                 # Test fixtures and test data
│   └── sample_data.py        # Sample test data
├── helpers/                  # Test helper functions
│   └── client.py             # Test client utilities
└── pytest.ini                # Pytest configuration
```

## Running Tests

### Run all tests
```bash
npm test
# or
npm run test:server
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
cd apps/server
python -m pytest ../../test/server/test_health.py -v
```

### Run tests matching a pattern
```bash
cd apps/server
python -m pytest ../../test/server -k "auth" -v
```

### Run tests with specific marker
```bash
cd apps/server
python -m pytest ../../test/server -m "api" -v
```

## Test Markers

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.database` - Database tests
- `@pytest.mark.slow` - Slow running tests

## Test Fixtures

The `conftest.py` file provides the following fixtures:

- `test_db` - In-memory SQLite database session (function scope)
- `client` - FastAPI test client with test database
- `test_user` - Test user fixture
- `test_user_2` - Second test user fixture
- `test_api_key` - Test API key fixture (encrypted)
- `test_project` - Test project fixture
- `test_conversation` - Test conversation fixture
- `auth_headers` - Authentication headers for test user
- `auth_headers_user_2` - Authentication headers for second test user

## Test Coverage

The test suite covers:

### API Endpoints
- ✅ Health endpoints (/, /health, /models)
- ✅ Authentication (signup, login, change password, forgot password, reset password)
- ✅ Projects (create, get, update, delete, file upload)
- ✅ Conversations (create, get, update, delete, messages)
- ✅ API Keys (create, get, decrypt, delete, test)
- ✅ Custom Integrations (create, get, update, delete)
- ✅ Chat (with memory integration and LLM routing)
- ✅ File Upload (validation, storage, project files)

### Services
- ✅ LLM Router (OpenAI, Anthropic, Mistral, custom integrations)
- ✅ Mem0 Client (memory search, memory addition)

### Utilities
- ✅ Encryption (key encryption/decryption)
- ✅ Security (input validation, sanitization)
- ✅ Cache (API key caching with TTL)
- ✅ Prompt (memory formatting, prompt composition)
- ✅ API Key Validation (provider-specific validation)

### Database
- ✅ User CRUD operations
- ✅ API Key CRUD operations
- ✅ Project CRUD operations
- ✅ Conversation CRUD operations
- ✅ Message CRUD operations
- ✅ Custom Integration CRUD operations
- ✅ Project File CRUD operations

## Writing Tests

### Example: Testing an API endpoint

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.api
class TestMyEndpoint:
    def test_my_endpoint_success(self, client: TestClient, auth_headers):
        response = client.get("/my-endpoint", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
```

### Example: Testing a utility function

```python
import pytest

@pytest.mark.unit
class TestMyUtility:
    def test_my_utility_function(self):
        from apps.server.utils.my_utility import my_function
        result = my_function("input")
        assert result == "expected_output"
```

## Test Database

Tests use an in-memory SQLite database that is created and destroyed for each test. This ensures test isolation and fast test execution.

## Environment Variables

Tests use the following environment variables:

- `ENCRYPTION_KEY` - Encryption key for testing (automatically set by fixtures)
- `DATABASE_URL` - Database URL (defaults to in-memory SQLite for tests)
- `ENVIRONMENT` - Environment name (set to "test" for tests)

## Coverage

Coverage reports are generated in the `test/coverage_html` directory. Open `test/coverage_html/index.html` in a browser to view the coverage report.

## CI/CD

Tests are automatically run in CI/CD pipelines. See `.github/workflows/backend-ci.yml` for details.

