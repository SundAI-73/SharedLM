# Quick Start: Testing URL-Based Routing

## Prerequisites

1. **Backend running:**
   ```bash
   cd apps/server
   python -m uvicorn app:app --reload
   ```

2. **Install test dependencies:**
   ```bash
   pip install requests
   ```

## Quick Test (5 minutes)

### Step 1: Run Automated Backend Tests

```bash
# From project root
python test/test_url_based_routing.py user_your_user_id
```

**What it tests:**
- ✅ URL detection (localhost vs non-localhost)
- ✅ Creating custom integrations
- ✅ Backend routing logic
- ✅ Cloud provider handling

### Step 2: Manual Frontend Test

1. **Launch Electron app**
2. **Open DevTools** (F12)
3. **Go to Console tab**
4. **Copy and paste this:**

```javascript
// Quick test: Check routing
async function quickTest() {
    const userId = prompt("Enter your user ID:");
    const integrations = await apiService.getCustomIntegrations(userId);
    
    console.log("Custom Integrations:");
    integrations.forEach(int => {
        const isLocalhost = /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(int.base_url || '');
        console.log(`  ${int.name}: ${isLocalhost ? 'localhost (client-side)' : 'non-localhost (backend)'}`);
    });
    
    console.log(`\nRunning in: ${window.electron ? 'Electron (can use localhost)' : 'Web (localhost rejected)'}`);
}

quickTest();
```

5. **Test localhost LLM:**
   - Select a local LLM model
   - Open Network tab
   - Send a message
   - ✅ Should see: Direct request to `localhost:11434`
   - ❌ Should NOT see: Request to `/chat` endpoint

6. **Test cloud provider:**
   - Select OpenAI/Mistral/Anthropic
   - Send a message
   - ✅ Should see: Request to `/chat` endpoint

## Expected Results

### ✅ Success Indicators

**Backend Tests:**
```
✓ URL detection logic
✓ Created localhost integration
✓ Created non-localhost integration
✓ Non-localhost goes through backend
```

**Frontend Tests:**
- Localhost LLM: No backend call
- Cloud provider: Backend call present
- Web: Localhost rejected with error

### ❌ Failure Indicators

- Backend tests fail with 401/403 → Check user ID
- Backend tests fail with connection error → Check backend is running
- Frontend: Localhost LLM calls backend → Check routing logic
- Frontend: Web allows localhost → Check rejection logic

## Full Test Suite

For comprehensive testing, run:

```bash
python test/run_all_tests.py user_your_user_id
```

This runs:
1. Web vs App restriction tests
2. Local LLM setup tests
3. Fallback URL tests
4. **URL-based routing tests** (new)

## Troubleshooting

**Backend not responding:**
```bash
# Check if running
curl http://localhost:8000/health

# Start if not running
cd apps/server
python -m uvicorn app:app --reload
```

**Tests fail with authentication:**
- Make sure user ID exists in database
- Check `X-User-ID` header is being sent

**Ollama not found:**
- Tests will still run, but localhost LLM tests may fail
- Install Ollama: https://ollama.ai

## Next Steps

After quick tests pass:
1. Read full guide: `test/README_URL_ROUTING_TESTS.md`
2. Run comprehensive test suite
3. Test in production environment
4. Monitor backend logs

