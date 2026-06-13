/**
 * Client-side handler for local LLM (Ollama)
 * Handles local LLM requests entirely client-side, bypassing cloud backend
 */

/**
 * Call local Ollama API directly from client
 * @param {string} baseUrl - Base URL for Ollama (e.g., http://localhost:11434/v1)
 * @param {string} model - Model name (e.g., gemma3)
 * @param {string} prompt - User prompt
 * @param {Array} fallbackUrls - Array of fallback URLs to try
 * @returns {Promise<string>} Response from Ollama
 */
export async function callLocalOllama(baseUrl, model, prompt, fallbackUrls = []) {
  const urlsToTry = [baseUrl, ...fallbackUrls];
  
  let lastError = null;
  
  for (const url of urlsToTry) {
    try {
      if (!url) continue;
      
      // Check if URL is localhost (only allow localhost for local LLM)
      const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0');
      if (!isLocalhost) {
        console.warn(`Skipping non-localhost URL: ${url}`);
        continue;
      }
      
      const response = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: prompt }
          ],
          stream: false,
          temperature: 0.7,
          max_tokens: 1000
        }),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      
      if (!reply) {
        throw new Error('No response content from Ollama');
      }
      
      return reply;
      
    } catch (error) {
      lastError = error;
      console.warn(`Failed to connect to ${url}:`, error.message);
      // Continue to next fallback
      continue;
    }
  }
  
  // All URLs failed
  throw new Error(
    `Failed to connect to local Ollama. Tried ${urlsToTry.length} URL(s). ` +
    `Last error: ${lastError?.message || 'Unknown error'}. ` +
    `Make sure Ollama is running locally.`
  );
}

/**
 * Check if Ollama is available at a given URL
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} True if Ollama is available
 */
export async function checkOllamaAvailable(url) {
  try {
    const response = await fetch(`${url}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

