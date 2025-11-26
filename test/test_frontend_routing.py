"""
Frontend routing tests (to be run manually in browser console)

These tests verify that:
1. Localhost URLs are handled client-side in Electron
2. Localhost URLs are rejected in web
3. Non-localhost URLs go through backend
4. Cloud providers go through backend

Run these in browser DevTools console while testing the application.
"""

FRONTEND_TESTS = """
// ============================================================
// Frontend URL-Based Routing Tests
// ============================================================
// Run these in browser DevTools console

// Test 1: Check if running in Electron
function testElectronDetection() {
    console.log("Test 1: Electron Detection");
    console.log("window.electron exists:", typeof window.electron !== 'undefined');
    console.log("Running in Electron:", !!window.electron);
    return !!window.electron;
}

// Test 2: Check custom integrations and detect localhost
async function testLocalhostDetection() {
    console.log("\\nTest 2: Localhost Detection");
    
    // You need to set userId
    const userId = prompt("Enter your user ID:");
    if (!userId) {
        console.error("User ID required");
        return;
    }
    
    try {
        const integrations = await apiService.getCustomIntegrations(userId);
        console.log(`Found ${integrations.length} custom integration(s)`);
        
        const localhostIntegrations = integrations.filter(int => {
            const url = int.base_url || '';
            return /localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0/i.test(url);
        });
        
        console.log(`Found ${localhostIntegrations.length} localhost integration(s):`);
        localhostIntegrations.forEach(int => {
            console.log(`  - ${int.name}: ${int.base_url}`);
        });
        
        const nonLocalhostIntegrations = integrations.filter(int => {
            const url = int.base_url || '';
            return !/localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0/i.test(url);
        });
        
        console.log(`Found ${nonLocalhostIntegrations.length} non-localhost integration(s):`);
        nonLocalhostIntegrations.forEach(int => {
            console.log(`  - ${int.name}: ${int.base_url}`);
        });
        
        return {
            localhost: localhostIntegrations,
            nonLocalhost: nonLocalhostIntegrations
        };
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

// Test 3: Monitor network requests for localhost LLM
function testLocalhostNetworkMonitoring() {
    console.log("\\nTest 3: Network Monitoring Setup");
    console.log("Open DevTools → Network tab");
    console.log("Filter by 'chat' to see backend requests");
    console.log("Filter by 'localhost' to see direct Ollama requests");
    console.log("\\nWhen using localhost LLM:");
    console.log("  ✓ Should see requests to localhost:11434");
    console.log("  ✗ Should NOT see requests to /chat endpoint");
    console.log("\\nWhen using cloud provider:");
    console.log("  ✓ Should see requests to /chat endpoint");
    console.log("  ✗ Should NOT see requests to localhost");
}

// Test 4: Test URL-based routing logic
function testURLRoutingLogic() {
    console.log("\\nTest 4: URL Routing Logic");
    
    const testUrls = [
        { url: "http://localhost:11434/v1", shouldBeLocalhost: true },
        { url: "http://127.0.0.1:11434/v1", shouldBeLocalhost: true },
        { url: "http://0.0.0.0:11434/v1", shouldBeLocalhost: true },
        { url: "http://192.168.1.100:8000/v1", shouldBeLocalhost: false },
        { url: "https://api.openai.com/v1", shouldBeLocalhost: false }
    ];
    
    testUrls.forEach(({ url, shouldBeLocalhost }) => {
        const isLocalhost = /localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0/i.test(url);
        const result = isLocalhost === shouldBeLocalhost ? "✓" : "✗";
        console.log(`${result} ${url} → ${isLocalhost ? 'localhost' : 'non-localhost'}`);
    });
}

// Test 5: Simulate sendMessage routing decision
async function testSendMessageRouting(userId, modelChoice) {
    console.log("\\nTest 5: SendMessage Routing Decision");
    console.log(`Testing with modelChoice: ${modelChoice}`);
    
    if (!modelChoice || !modelChoice.startsWith('custom_')) {
        console.log("Not a custom integration - will go through backend");
        return { route: "backend", reason: "Not a custom integration" };
    }
    
    try {
        const integrations = await apiService.getCustomIntegrations(userId);
        const integration = integrations.find(int => int.provider_id === modelChoice);
        
        if (!integration) {
            console.log("Integration not found - will go through backend");
            return { route: "backend", reason: "Integration not found" };
        }
        
        const url = integration.base_url || '';
        const isLocalhost = /localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0/i.test(url);
        const isElectron = !!window.electron;
        
        console.log(`Integration: ${integration.name}`);
        console.log(`Base URL: ${url}`);
        console.log(`Is Localhost: ${isLocalhost}`);
        console.log(`Is Electron: ${isElectron}`);
        
        if (isLocalhost && isElectron) {
            console.log("→ Route: CLIENT-SIDE (localhost + Electron)");
            return { route: "client-side", reason: "localhost in Electron" };
        } else if (isLocalhost && !isElectron) {
            console.log("→ Route: REJECTED (localhost in web)");
            return { route: "rejected", reason: "localhost in web" };
        } else {
            console.log("→ Route: BACKEND (non-localhost)");
            return { route: "backend", reason: "non-localhost URL" };
        }
    } catch (error) {
        console.error("Error:", error);
        return { route: "error", reason: error.message };
    }
}

// Run all tests
async function runAllFrontendTests() {
    console.log("=".repeat(60));
    console.log("Frontend URL-Based Routing Tests");
    console.log("=".repeat(60));
    
    testElectronDetection();
    await testLocalhostDetection();
    testLocalhostNetworkMonitoring();
    testURLRoutingLogic();
    
    console.log("\\n" + "=".repeat(60));
    console.log("To test sendMessage routing:");
    console.log("  await testSendMessageRouting(userId, 'custom_local_gemma3')");
    console.log("=".repeat(60));
}

// Export for use
if (typeof window !== 'undefined') {
    window.testURLRouting = {
        testElectronDetection,
        testLocalhostDetection,
        testLocalhostNetworkMonitoring,
        testURLRoutingLogic,
        testSendMessageRouting,
        runAllFrontendTests
    };
    console.log("Frontend tests loaded. Run: testURLRouting.runAllFrontendTests()");
}
"""

# Write to a file that can be loaded in browser
print("Frontend tests code:")
print(FRONTEND_TESTS)
print("\nTo use these tests:")
print("1. Open browser DevTools console")
print("2. Copy and paste the test code")
print("3. Run: testURLRouting.runAllFrontendTests()")

