import mistralLogo from '../../../assets/images/m-boxed-orange.png';
import openaiLogo from '../../../assets/images/openai-logo.svg';
import anthropicLogo from '../../../assets/images/claude-color.svg';
import inceptionLogo from '../../../assets/images/inception-labs.png';

export const generateChatTitle = (userMessage) => {
  const message = userMessage.toLowerCase();
  const cleaned = message
    .replace(/^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|tell me|explain|show me|help me with)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();
  
  const title = cleaned
    .split(' ')
    .slice(0, 6)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return title.length > 40 ? title.substring(0, 40) + '...' : title;
};

export const getModelLogo = (modelName, customIntegrations = []) => {
  if (!modelName) return null;
  
  const modelLower = modelName.toLowerCase();
  
  // Check for provider names directly first
  if (modelLower === 'openai') {
    return openaiLogo;
  }
  if (modelLower === 'anthropic') {
    return anthropicLogo;
  }
  if (modelLower === 'mistral') {
    return mistralLogo;
  }
  if (modelLower === 'inception') {
    return inceptionLogo;
  }
  
  // Check for OpenAI models
  if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return openaiLogo;
  }
  
  // Check for Anthropic/Claude models
  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return anthropicLogo;
  }
  
  // Check for Mistral models
  if (modelLower.includes('mistral') || modelLower.includes('mixtral')) {
    return mistralLogo;
  }
  
  // Check for Inception models
  if (modelLower.includes('mercury') || modelLower.includes('inception')) {
    return inceptionLogo;
  }
  
  // Check for custom integrations
  // Custom integration names are returned as the model identifier
  const customIntegration = customIntegrations.find(int => 
    int.name && modelLower.includes(int.name.toLowerCase())
  );
  if (customIntegration && customIntegration.logo_url) {
    return customIntegration.logo_url;
  }
  
  // Fallback: check if model name matches any custom integration provider_id
  const customByProvider = customIntegrations.find(int => 
    modelLower.includes(int.provider_id.toLowerCase().replace('custom_', ''))
  );
  if (customByProvider && customByProvider.logo_url) {
    return customByProvider.logo_url;
  }
  
  return null;
};

export const defaultModelVariants = {
  mistral: [
    { value: 'mistral-small-latest', label: 'SMALL' },
    { value: 'mistral-medium-latest', label: 'MEDIUM' },
    { value: 'open-mistral-7b', label: '7B' },
    { value: 'open-mixtral-8x7b', label: '8X7B' }
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4O' },
    { value: 'gpt-4o-mini', label: 'GPT-4O MINI' },
    { value: 'gpt-4-turbo', label: 'GPT-4 TURBO' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 TURBO' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'SONNET 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'SONNET 3.5' },
    { value: 'claude-3-5-haiku-20241022', label: 'HAIKU 3.5' },
    { value: 'claude-3-opus-20240229', label: 'OPUS 3' },
    { value: 'claude-3-sonnet-20240229', label: 'SONNET 3' },
    { value: 'claude-3-haiku-20240307', label: 'HAIKU 3' }
  ],
  inception: [
    { value: 'mercury', label: 'MERCURY' },
    { value: 'mercury-coder', label: 'MERCURY CODER' }
  ]
};

export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 22) return 'Evening';
  return 'Night';
};

export const getUserDisplayName = () => {
  const name = localStorage.getItem('sharedlm_user_name') || localStorage.getItem('sharedlm_user_email')?.split('@')[0] || 'there';
  return name.split(' ')[0]; // Get first name only
};

