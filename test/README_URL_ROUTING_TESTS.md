# URL-Based Routing Tests

This guide explains how to test the new URL-based routing implementation.

## Overview

The new implementation routes requests based on URL type:
- **Localhost URLs** → Client-side in Electron, rejected in web
- **Non-localhost custom URLs** → Backend (both app and web)
- **Cloud providers** → Backend (both app and web)

## Automated Tests

### 1. Backend Tests (`test_url_based_routing.py`)

Tests backend behavior for URL-based routing.

**What it tests:**
- URL detection logic (localhost vs non-localhost)
- Creating localhost custom integrations
- Creating non-localhost custom integrations
- Backend rejection of localhost URLs on cloud
- Non-localhost integrations going through backend
- Cloud providers going through backend

**How to run:**
```bash
# Basic usage
python test/test_url_based_routing.py

# With custom user ID
python test/test_url_based_routing.py user_your_user_id

# With custom backend URL
API_BASE_URL=http://your-backend.com python test/test_url_based_routing.py
```

**Expected output:**
```
============================================================
URL-Based Routing Test Suite
============================================================
✓ Backend is running
✓ URL detection logic
✓ Created localhost integration
✓ Created non-localhost integration
✓ Non-localhost goes through backend
✓ Cloud provider goes through backend
```

### 2. Frontend Tests (`test_frontend_routing.py`)

JavaScript tests to run in browser DevTools console.

**How to use:**
1. Open your application (Electron or web)
2. Open DevTools (F12)
3. Go to Console tab
4. Copy and paste the test code from `test_frontend_routing.py`
5. Run: `testURLRouting.runAllFrontendTests()`

**What it tests:**
- Electron detection
- Localhost URL detection
- Network request monitoring
- Routing decision logic

## Manual Testing Checklist

### Electron App Testing

#### Test 1: Localhost LLM (Client-Side)
- [ ] Launch Electron app
- [ ] Open DevTools → Network tab
- [ ] Select localhost LLM model
- [ ] Send test message
- [ ] Verify: NO request to `/chat` endpoint
- [ ] Verify: Direct request to `localhost:11434` (if Ollama running)

#### Test 2: Cloud Provider (Backend)
- [ ] Select cloud provider (OpenAI, Anthropic, Mistral)
- [ ] Send test message
- [ ] Verify: Request to `/chat` endpoint
- [ ] Verify: Response received

#### Test 3: Non-Localhost Custom Integration (Backend)
- [ ] Create custom integration with non-localhost URL
- [ ] Select the integration
- [ ] Send test message
- [ ] Verify: Request to `/chat` endpoint
- [ ] Verify: Backend processes request

### Web Testing

#### Test 4: Localhost LLM Rejection
- [ ] Open web version
- [ ] Try to select localhost LLM model
- [ ] Verify: Error message shown
- [ ] Verify: NO request sent to backend
- [ ] Verify: NO request to Ollama

#### Test 5: Cloud Provider (Backend)
- [ ] Select cloud provider
- [ ] Send test message
- [ ] Verify: Request to `/chat` endpoint
- [ ] Verify: Response received

#### Test 6: Non-Localhost Custom Integration (Backend)
- [ ] Create custom integration with non-localhost URL
- [ ] Select the integration
- [ ] Send test message
- [ ] Verify: Request to `/chat` endpoint

## Network Monitoring

### What to Look For

**Localhost LLM in Electron:**
```
Network Tab:
  ✓ POST http://localhost:11434/v1/chat/completions
  ✗ POST http://your-backend.com/chat (should NOT appear)
```

**Cloud Provider:**
```
Network Tab:
  ✓ POST http://your-backend.com/chat
  ✗ POST http://localhost:11434/... (should NOT appear)
```

**Non-Localhost Custom Integration:**
```
Network Tab:
  ✓ POST http://your-backend.com/chat
  (Backend then calls your custom server)
```

## Backend Log Monitoring

### Local Backend

```bash
# Watch backend logs
tail -f logs/server.log

# Or if using uvicorn directly
# Logs will show in terminal
```

**What to see:**
- **Localhost LLM**: NO `/chat` requests in logs
- **Cloud Provider**: `/chat` requests with model_provider
- **Non-Localhost Custom**: `/chat` requests with custom integration

### Cloud Backend (Render)

Check Render logs dashboard:
- **Localhost LLM**: Should see rejection (400 error)
- **Cloud Provider**: Normal processing
- **Non-Localhost Custom**: Normal processing

## Test Scenarios

### Scenario 1: Complete Local LLM Flow (Electron)

1. Start Ollama: `ollama serve`
2. Install model: `ollama pull gemma3`
3. Launch Electron app
4. Verify local LLM appears in dropdown
5. Select local LLM
6. Send message
7. Verify: Works without backend call

### Scenario 2: Web Restriction

1. Open web version
2. Try to use local LLM
3. Verify: Clear error message
4. Verify: No backend call
5. Verify: No Ollama call

### Scenario 3: Custom Server Integration

1. Set up custom LLM server (e.g., on `192.168.1.100:8000`)
2. Create custom integration with that URL
3. Test in both Electron and web
4. Verify: Both go through backend
5. Verify: Backend calls your custom server

### Scenario 4: Mixed Usage

1. Use local LLM in Electron (client-side)
2. Switch to cloud provider (backend)
3. Switch to custom server (backend)
4. Verify: Each routes correctly

## Troubleshooting

### Issue: Localhost LLM still calls backend

**Check:**
- Is URL actually localhost? Check integration `base_url`
- Is `window.electron` available? Check console
- Check frontend code routing logic

### Issue: Non-localhost custom integration doesn't work

**Check:**
- Is custom server running?
- Is URL accessible from backend?
- Check backend logs for connection errors
- Verify API type is correct

### Issue: Web shows localhost LLM

**Check:**
- Is `setupOllamaIntegration` being called in web?
- Should only run in Electron (check `window.electron`)
- Verify custom integrations endpoint returns correct data

### Issue: Backend rejects non-localhost

**Check:**
- Is backend detecting cloud environment incorrectly?
- Check environment variables (RENDER, VERCEL, etc.)
- Verify URL detection logic

## Expected Behavior Matrix

| Scenario | Electron App | Web | Backend Called? |
|----------|--------------|-----|-----------------|
| Localhost LLM | ✅ Works client-side | ❌ Rejected | ❌ No |
| Cloud Provider | ✅ Works | ✅ Works | ✅ Yes |
| Custom (non-localhost) | ✅ Works | ✅ Works | ✅ Yes |
| Custom (localhost) | ✅ Works client-side | ❌ Rejected | ❌ No |

## Running All Tests

```bash
# Run all automated tests
python test/run_all_tests.py user_your_user_id

# Run specific test
python test/test_url_based_routing.py user_your_user_id
```

## Next Steps

After tests pass:
1. Verify in production environment
2. Test with real users
3. Monitor backend logs for any issues
4. Check error rates and user feedback

