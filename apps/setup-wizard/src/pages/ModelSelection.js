import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import './ModelSelection.css';

const AVAILABLE_MODELS = [
  // Gemma 3 models
  {
    id: 'gemma3:1b',
    name: 'Gemma 3',
    parameters: '1B',
    size: 0.815,
    ram: 2,
    ollamaCommand: 'ollama run gemma3:1b',
    description: 'Ultra-lightweight model, perfect for low-resource systems',
    default: true
  },
  {
    id: 'gemma3',
    name: 'Gemma 3',
    parameters: '4B',
    size: 3.3,
    ram: 4,
    ollamaCommand: 'ollama run gemma3',
    description: 'Balanced performance and efficiency'
  },
  {
    id: 'gemma3:12b',
    name: 'Gemma 3',
    parameters: '12B',
    size: 8.1,
    ram: 16, // Ollama requirement: 16GB for 13B models (12B is close)
    ollamaCommand: 'ollama run gemma3:12b',
    description: 'High-quality responses with better reasoning'
  },
  {
    id: 'gemma3:27b',
    name: 'Gemma 3',
    parameters: '27B',
    size: 17,
    ram: 32, // Ollama requirement: 32GB for 33B models (27B is close)
    ollamaCommand: 'ollama run gemma3:27b',
    description: 'Premium model with excellent performance'
  },
  // QwQ
  {
    id: 'qwq',
    name: 'QwQ',
    parameters: '32B',
    size: 20,
    ram: 32, // Ollama requirement: 32GB for 33B models
    ollamaCommand: 'ollama run qwq',
    description: 'Advanced reasoning model'
  },
  // DeepSeek-R1
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1',
    parameters: '7B',
    size: 4.7,
    ram: 8, // Ollama requirement: 8GB for 7B models
    ollamaCommand: 'ollama run deepseek-r1',
    description: 'High-quality reasoning model'
  },
  {
    id: 'deepseek-r1:671b',
    name: 'DeepSeek-R1',
    parameters: '671B',
    size: 404,
    ram: 256,
    ollamaCommand: 'ollama run deepseek-r1:671b',
    description: 'Massive reasoning model (requires significant resources)'
  },
  // Llama 4
  {
    id: 'llama4:scout',
    name: 'Llama 4',
    parameters: '109B',
    size: 67,
    ram: 64,
    ollamaCommand: 'ollama run llama4:scout',
    description: 'Latest Llama model with advanced capabilities'
  },
  {
    id: 'llama4:maverick',
    name: 'Llama 4',
    parameters: '400B',
    size: 245,
    ram: 200,
    ollamaCommand: 'ollama run llama4:maverick',
    description: 'Ultra-large model for maximum performance'
  },
  // Llama 3.3
  {
    id: 'llama3.3',
    name: 'Llama 3.3',
    parameters: '70B',
    size: 43,
    ram: 64, // Very large model, requires significant RAM
    ollamaCommand: 'ollama run llama3.3',
    description: 'High-performance model with excellent quality'
  },
  // Llama 3.2
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2',
    parameters: '1B',
    size: 1.3,
    ram: 2,
    ollamaCommand: 'ollama run llama3.2:1b',
    description: 'Lightweight model for basic tasks'
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    parameters: '3B',
    size: 2.0,
    ram: 2,
    ollamaCommand: 'ollama run llama3.2',
    description: 'Balanced performance and quality'
  },
  // Llama 3.2 Vision
  {
    id: 'llama3.2-vision',
    name: 'Llama 3.2 Vision',
    parameters: '11B',
    size: 7.9,
    ram: 16, // Ollama requirement: 16GB for 13B models (11B is close, vision models need more)
    ollamaCommand: 'ollama run llama3.2-vision',
    description: 'Vision-capable model for image understanding'
  },
  {
    id: 'llama3.2-vision:90b',
    name: 'Llama 3.2 Vision',
    parameters: '90B',
    size: 55,
    ram: 64, // Very large model, requires significant RAM
    ollamaCommand: 'ollama run llama3.2-vision:90b',
    description: 'Large vision model with advanced capabilities'
  },
  // Llama 3.1
  {
    id: 'llama3.1',
    name: 'Llama 3.1',
    parameters: '8B',
    size: 4.7,
    ram: 8, // Ollama requirement: 8GB for 7-8B models
    ollamaCommand: 'ollama run llama3.1',
    description: 'Reliable and well-tested model'
  },
  {
    id: 'llama3.1:405b',
    name: 'Llama 3.1',
    parameters: '405B',
    size: 231,
    ram: 200,
    ollamaCommand: 'ollama run llama3.1:405b',
    description: 'Massive model for enterprise use'
  },
  // Phi 4
  {
    id: 'phi4',
    name: 'Phi 4',
    parameters: '14B',
    size: 9.1,
    ram: 16, // Ollama requirement: 16GB for 13B models (14B is close)
    ollamaCommand: 'ollama run phi4',
    description: 'Microsoft\'s efficient model'
  },
  {
    id: 'phi4-mini',
    name: 'Phi 4 Mini',
    parameters: '3.8B',
    size: 2.5,
    ram: 2,
    ollamaCommand: 'ollama run phi4-mini',
    description: 'Lightweight Microsoft model'
  },
  // Mistral
  {
    id: 'mistral',
    name: 'Mistral',
    parameters: '7B',
    size: 4.1,
    ram: 8, // Ollama requirement: 8GB for 7B models
    ollamaCommand: 'ollama run mistral',
    description: 'High quality responses, well-optimized'
  },
  // Moondream 2
  {
    id: 'moondream',
    name: 'Moondream 2',
    parameters: '1.4B',
    size: 0.829,
    ram: 2,
    ollamaCommand: 'ollama run moondream',
    description: 'Compact vision model for image analysis'
  },
  // Neural Chat
  {
    id: 'neural-chat',
    name: 'Neural Chat',
    parameters: '7B',
    size: 4.1,
    ram: 8, // Ollama requirement: 8GB for 7B models
    ollamaCommand: 'ollama run neural-chat',
    description: 'Optimized for conversational AI'
  },
  // Starling
  {
    id: 'starling-lm',
    name: 'Starling',
    parameters: '7B',
    size: 4.1,
    ram: 8, // Ollama requirement: 8GB for 7B models
    ollamaCommand: 'ollama run starling-lm',
    description: 'High-performance conversational model'
  },
  // Code Llama
  {
    id: 'codellama',
    name: 'Code Llama',
    parameters: '7B',
    size: 3.8,
    ram: 8, // Ollama requirement: 8GB for 7B models
    ollamaCommand: 'ollama run codellama',
    description: 'Specialized for code generation and understanding'
  },
  // Llama 2 Uncensored
  {
    id: 'llama2-uncensored',
    name: 'Llama 2 Uncensored',
    parameters: '7B',
    size: 3.8,
    ram: 8, // Ollama requirement: 8GB for 7B models
    ollamaCommand: 'ollama run llama2-uncensored',
    description: 'Uncensored variant of Llama 2'
  },
  // LLAVA
  {
    id: 'llava',
    name: 'LLAVA',
    parameters: '7B',
    size: 4.5,
    ram: 8, // Ollama requirement: 8GB for 7B models
    ollamaCommand: 'ollama run llava',
    description: 'Large Language and Vision Assistant'
  },
  // Granite-3.3
  {
    id: 'granite3.3',
    name: 'Granite-3.3',
    parameters: '8B',
    size: 4.9,
    ram: 8, // Ollama requirement: 8GB for 7-8B models
    ollamaCommand: 'ollama run granite3.3',
    description: 'IBM\'s efficient model'
  }
];

const ModelSelection = ({ systemInfo, selectedModels, installPath, onModelsChange, onSystemInfoLoaded, onExistingModelsLoaded, onNext, onBack }) => {
  const [localSelected, setLocalSelected] = useState(selectedModels);
  const [isScanning, setIsScanning] = useState(true);
  const [localSystemInfo, setLocalSystemInfo] = useState(systemInfo);
  const [diskSpace, setDiskSpace] = useState({ free: 0, total: 0 });
  const [isValidatingDisk, setIsValidatingDisk] = useState(false);
  const [existingModels, setExistingModels] = useState([]);
  const [modelsToRemove, setModelsToRemove] = useState([]);

  useEffect(() => {
    scanSystem();
  }, []);

  useEffect(() => {
    if (installPath) {
      checkDiskSpace();
    }
  }, [installPath]);

  useEffect(() => {
    if (localSystemInfo) {
      onSystemInfoLoaded(localSystemInfo);
      // Auto-select default model only if no existing models were found
      const defaultModel = AVAILABLE_MODELS.find(m => m.default);
      if (defaultModel && localSelected.length === 0 && existingModels.length === 0) {
        setLocalSelected([defaultModel.id]);
        onModelsChange([defaultModel.id], [defaultModel], []);
      }
    }
  }, [localSystemInfo]);

  useEffect(() => {
    // Get full model data for selected models
    const selectedModelData = AVAILABLE_MODELS.filter(m => localSelected.includes(m.id));
    onModelsChange(localSelected, selectedModelData, modelsToRemove);
  }, [localSelected, modelsToRemove]);

  const scanSystem = async () => {
    setIsScanning(true);
    try {
      if (window.electron?.getSystemInfo) {
        const info = await window.electron.getSystemInfo();
        setLocalSystemInfo(info);
      } else {
        // Fallback mock data
        setLocalSystemInfo({
          ram: { total: 16, free: 8, used: 8 },
          cpu: { cores: 8, model: 'Intel Core i7', speed: 3000 },
          gpu: ['NVIDIA GeForce RTX 3060'],
          platform: 'win32',
          arch: 'x64'
        });
      }
      
      // Check for existing Ollama models
      if (window.electron?.getExistingOllamaModels) {
        try {
          const existing = await window.electron.getExistingOllamaModels();
          setExistingModels(existing || []);
          
          // Store existing models for display
          if (existing && existing.length > 0) {
            // Notify parent about existing models
            if (onExistingModelsLoaded) {
              onExistingModelsLoaded(existing);
            }
          }
        } catch (error) {
          console.error('Error getting existing models:', error);
        }
      }
    } catch (error) {
      console.error('Error scanning system:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const checkDiskSpace = async () => {
    if (window.electron?.getDiskSpace && installPath) {
      setIsValidatingDisk(true);
      try {
        const space = await window.electron.getDiskSpace(installPath);
        setDiskSpace(space);
      } catch (error) {
        console.error('Error checking disk space:', error);
      } finally {
        setIsValidatingDisk(false);
      }
    }
  };

  const toggleModel = (modelId) => {
    setLocalSelected(prev => {
      const model = AVAILABLE_MODELS.find(m => m.id === modelId);
      const isDefault = model?.default || false;
      
      if (prev.includes(modelId)) {
        // Trying to deselect
        // If it's the default model, check if other models are selected
        if (isDefault) {
          const otherModelsSelected = prev.filter(id => {
            const m = AVAILABLE_MODELS.find(mod => mod.id === id);
            return m && !m.default;
          });
          
          // Can only remove default if other models are selected
          if (otherModelsSelected.length === 0) {
            // Cannot remove default model if it's the only one selected
            return prev;
          }
        }
        return prev.filter(id => id !== modelId);
      } else {
        // Selecting a new model
        return [...prev, modelId];
      }
    });
  };
  
  const canRemoveDefault = () => {
    const defaultModel = AVAILABLE_MODELS.find(m => m.default);
    if (!defaultModel) return false;
    
    const isDefaultSelected = localSelected.includes(defaultModel.id);
    if (!isDefaultSelected) return true; // Default not selected, so can't remove it anyway
    
    // Check if other (non-default) models are selected
    const otherModelsSelected = localSelected.filter(id => {
      const m = AVAILABLE_MODELS.find(mod => mod.id === id);
      return m && !m.default;
    });
    
    return otherModelsSelected.length > 0;
  };

  const getCompatibleModels = () => {
    if (!localSystemInfo) return AVAILABLE_MODELS;
    
    const totalRAM = localSystemInfo.ram.total;
    const hasGPU = localSystemInfo.hasDedicatedGPU || false;
    
    // Ollama's official requirements:
    // - 8 GB RAM for 7B models
    // - 16 GB RAM for 13B models
    // - 32 GB RAM for 33B models
    // GPU can help with larger models by offloading computation
    
    return AVAILABLE_MODELS.filter(model => {
      // Check if system meets Ollama's RAM requirements
      // With GPU, we can be slightly more lenient (GPU helps with memory)
      const requiredRAM = model.ram;
      const gpuBonus = hasGPU ? 2 : 0; // GPU can help reduce RAM pressure slightly
      
      // System must have at least the required RAM
      // For very large models (>32GB), require exact match or more
      if (requiredRAM > 32) {
        return totalRAM >= requiredRAM;
      }
      
      // For standard models, allow if total RAM meets requirement (with small GPU bonus)
      return totalRAM >= (requiredRAM - gpuBonus);
    }).sort((a, b) => {
      // Sort: default first, then by RAM requirement
      if (a.default) return -1;
      if (b.default) return 1;
      
      // Prioritize models that match system capabilities
      // If system has 16GB+, show larger models first
      // If system has 32GB+, prioritize largest models
      if (totalRAM >= 32) {
        return b.ram - a.ram; // Largest first
      } else if (totalRAM >= 16) {
        // For 16GB systems, prioritize 8-16GB models
        if (a.ram <= 16 && b.ram > 16) return -1;
        if (b.ram <= 16 && a.ram > 16) return 1;
        return b.ram - a.ram;
      } else {
        // For <16GB systems, show smaller models first
        return a.ram - b.ram;
      }
    });
  };

  const getTotalStorageRequired = () => {
    return localSelected.reduce((total, modelId) => {
      const model = AVAILABLE_MODELS.find(m => m.id === modelId);
      return total + (model?.size || 0);
    }, 0);
  };

  const compatibleModels = getCompatibleModels();
  const totalStorage = getTotalStorageRequired();
  const hasDefaultSelected = localSelected.some(id => {
    const model = AVAILABLE_MODELS.find(m => m.id === id);
    return model?.default;
  });
  const hasEnoughSpace = diskSpace.free === 0 || totalStorage <= diskSpace.free;

  return (
    <div className="model-selection-page">
      <div className="model-selection-logo">
        <img src={`${process.env.PUBLIC_URL || ''}/logo.svg`} alt="SharedLM" className="logo-image" onError={(e) => { console.error('Logo failed to load:', e.target.src); }} />
      </div>
      <div className="model-selection-header">
        <h1 className="page-title">Model Selection</h1>
      </div>

      <div className="model-selection-content">
        {isScanning ? (
          <div className="scanning-status">
            <div className="scanning-spinner"></div>
            <p>Scanning system hardware...</p>
          </div>
        ) : (
          <>
            <div className="model-selection-instructions">
              <p>Select the AI models you want to install. Models are recommended based on your system capabilities.</p>
            </div>

            <div className="system-info-panel">
              <h3 className="panel-title">System Information</h3>
              <div className="system-specs">
                <div className="spec-item">
                  <MemoryStick size={16} />
                  <span>RAM: {localSystemInfo?.ram?.total?.toFixed(1) || 0} GB total, {localSystemInfo?.ram?.free?.toFixed(1) || 0} GB available</span>
                </div>
                <div className="spec-item">
                  <Cpu size={16} />
                  <span>CPU: {localSystemInfo?.cpu?.cores || 0} cores - {localSystemInfo?.cpu?.model || 'Unknown'}</span>
                </div>
                {localSystemInfo?.gpu && localSystemInfo.gpu.length > 0 && (
                  <div className="spec-item">
                    <span>GPU: {localSystemInfo.gpu.join(', ')} {localSystemInfo?.hasDedicatedGPU ? '(Dedicated)' : '(Integrated)'}</span>
                  </div>
                )}
                <div className="spec-item">
                  <span>Platform: {localSystemInfo?.platformName || localSystemInfo?.platform || 'Unknown'} ({localSystemInfo?.arch || 'Unknown'})</span>
                </div>
              </div>
            </div>

            <div className="models-section">
              <div className="models-list">
                {compatibleModels.map(model => {
                  const isSelected = localSelected.includes(model.id);
                  const isDefault = model.default;
                  const canRemove = canRemoveDefault();
                  const isDefaultLocked = isDefault && isSelected && !canRemove;
                  
                  return (
                    <div
                      key={model.id}
                      className={`model-card ${isSelected ? 'selected' : ''} ${isDefault ? 'default' : ''} ${isDefaultLocked ? 'locked' : ''}`}
                      onClick={() => {
                        if (isDefault && isDefaultLocked) {
                          // Default model is locked, don't allow removal
                          return;
                        }
                        toggleModel(model.id);
                      }}
                    >
                      <div className="model-checkbox">
                        {isSelected ? (
                          <div className="checkbox-checked">
                            <Check size={14} />
                          </div>
                        ) : (
                          <div className="checkbox-unchecked" />
                        )}
                      </div>
                      <div className="model-info">
                        <div className="model-header">
                          <span className="model-name">{model.name}</span>
                          {isDefault && <span className="default-badge">Default</span>}
                          {isDefaultLocked && <span className="required-badge">Required</span>}
                        </div>
                        <p className="model-description">{model.description}</p>
                        <div className="model-specs">
                          <span className="model-spec">Parameters: {model.parameters}</span>
                          <span className="model-spec">Size: {model.size} GB</span>
                          <span className="model-spec">RAM: {model.ram} GB</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {compatibleModels.length < AVAILABLE_MODELS.length && (
                <div className="incompatible-warning">
                  <AlertTriangle size={16} />
                  <span>Some models are hidden due to insufficient RAM</span>
                </div>
              )}
              
              {existingModels.length > 0 && (
                <div className="existing-models-section">
                  <h3 className="existing-models-title">Existing Models on Your System</h3>
                  <p className="existing-models-description">
                    We found {existingModels.length} model(s) already installed. You can keep them or remove them to save space.
                  </p>
                  <div className="existing-models-list">
                    {existingModels.map((modelName, index) => {
                      const isSelected = localSelected.some(id => {
                        const model = AVAILABLE_MODELS.find(m => m.id === id);
                        return model && (modelName === model.id || modelName === model.id.split(':')[0] || modelName.startsWith(model.id.split(':')[0]));
                      });
                      const isMarkedForRemoval = modelsToRemove.includes(modelName);
                      
                      return (
                        <div key={index} className={`existing-model-item ${isMarkedForRemoval ? 'marked-for-removal' : ''}`}>
                          <div className="existing-model-info">
                            <span className="existing-model-name">{modelName}</span>
                            {isSelected && (
                              <span className="existing-model-status">(Will be kept)</span>
                            )}
                            {isMarkedForRemoval && (
                              <span className="existing-model-status removal">(Will be removed)</span>
                            )}
                          </div>
                          {!isSelected && (
                            <button
                              className="existing-model-action-btn"
                              onClick={() => {
                                if (isMarkedForRemoval) {
                                  setModelsToRemove(prev => prev.filter(m => m !== modelName));
                                } else {
                                  setModelsToRemove(prev => [...prev, modelName]);
                                }
                              }}
                            >
                              {isMarkedForRemoval ? 'Keep' : 'Remove'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </>
        )}
      </div>

      <div className="model-selection-footer">
        <div className="model-selection-disk-info">
          {isValidatingDisk ? (
            <div className="model-selection-disk-summary">
              <HardDrive size={16} />
              <span>Checking disk space...</span>
            </div>
          ) : diskSpace.free > 0 ? (
            <div className={`model-selection-disk-summary ${!hasEnoughSpace ? 'insufficient-space' : ''}`}>
              <HardDrive size={16} />
              <span>{diskSpace.free.toFixed(1)} GB free space available. At least {totalStorage.toFixed(1)} GB required.</span>
            </div>
          ) : (
            <div className="model-selection-disk-summary">
              <HardDrive size={16} />
              <span>Total storage required: <strong>{totalStorage.toFixed(1)} GB</strong></span>
            </div>
          )}
        </div>
        <div className="model-selection-footer-buttons">
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={onNext}
            disabled={!hasDefaultSelected || localSelected.length === 0 || !hasEnoughSpace}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelSelection;

