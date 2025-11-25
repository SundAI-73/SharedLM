import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import './ModelSelection.css';

const AVAILABLE_MODELS = [
  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini',
    size: 2.3,
    ram: 2,
    description: 'Lightweight, fast model perfect for most tasks',
    default: true
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    size: 2.0,
    ram: 2,
    description: 'Balanced performance and quality'
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    size: 2.0,
    ram: 2,
    description: 'Smaller variant, faster inference'
  },
  {
    id: 'mistral',
    name: 'Mistral 7B',
    size: 4.1,
    ram: 4,
    description: 'High quality responses, requires more RAM'
  },
  {
    id: 'qwen2.5',
    name: 'Qwen 2.5',
    size: 1.5,
    ram: 2,
    description: 'Efficient multilingual model'
  },
  {
    id: 'gemma2',
    name: 'Gemma 2',
    size: 2.0,
    ram: 2,
    description: 'Google\'s efficient model'
  }
];

const ModelSelection = ({ systemInfo, selectedModels, onModelsChange, onSystemInfoLoaded, onNext, onBack }) => {
  const [localSelected, setLocalSelected] = useState(selectedModels);
  const [isScanning, setIsScanning] = useState(true);
  const [localSystemInfo, setLocalSystemInfo] = useState(systemInfo);
  const [modelStoragePath, setModelStoragePath] = useState('');

  useEffect(() => {
    scanSystem();
  }, []);

  useEffect(() => {
    if (localSystemInfo) {
      onSystemInfoLoaded(localSystemInfo);
      // Auto-select default model
      const defaultModel = AVAILABLE_MODELS.find(m => m.default);
      if (defaultModel && localSelected.length === 0) {
        setLocalSelected([defaultModel.id]);
        onModelsChange([defaultModel.id]);
      }
    }
  }, [localSystemInfo]);

  useEffect(() => {
    onModelsChange(localSelected);
  }, [localSelected]);

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
    } catch (error) {
      console.error('Error scanning system:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleModel = (modelId) => {
    setLocalSelected(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const getCompatibleModels = () => {
    if (!localSystemInfo) return AVAILABLE_MODELS;
    
    const availableRAM = localSystemInfo.ram.free;
    return AVAILABLE_MODELS.filter(model => model.ram <= availableRAM);
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

  return (
    <div className="model-selection-page">
      <div className="model-selection-header">
        <h1 className="page-title">Model Selection</h1>
        <div className="step-indicator">Step 3 of 4</div>
      </div>

      <div className="model-selection-content">
        {isScanning ? (
          <div className="scanning-status">
            <div className="scanning-spinner"></div>
            <p>Scanning system hardware...</p>
          </div>
        ) : (
          <>
            <div className="system-info-panel">
              <h3 className="panel-title">System Information</h3>
              <div className="system-specs">
                <div className="spec-item">
                  <MemoryStick size={16} />
                  <span>RAM: {localSystemInfo?.ram?.total || 0} GB total, {localSystemInfo?.ram?.free || 0} GB available</span>
                </div>
                <div className="spec-item">
                  <Cpu size={16} />
                  <span>CPU: {localSystemInfo?.cpu?.cores || 0} cores - {localSystemInfo?.cpu?.model || 'Unknown'}</span>
                </div>
                {localSystemInfo?.gpu && localSystemInfo.gpu.length > 0 && (
                  <div className="spec-item">
                    <span>GPU: {localSystemInfo.gpu[0]}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="models-section">
              <p className="section-description">
                Select models to download. Phi-3 Mini is recommended and will be installed by default.
              </p>

              <div className="models-list">
                {compatibleModels.map(model => {
                  const isSelected = localSelected.includes(model.id);
                  const isDefault = model.default;
                  
                  return (
                    <div
                      key={model.id}
                      className={`model-card ${isSelected ? 'selected' : ''} ${isDefault ? 'default' : ''}`}
                      onClick={() => !isDefault && toggleModel(model.id)}
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
                        </div>
                        <p className="model-description">{model.description}</p>
                        <div className="model-specs">
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
            </div>

            <div className="storage-info">
              <div className="storage-summary">
                <HardDrive size={16} />
                <span>Total storage required: <strong>{totalStorage.toFixed(1)} GB</strong></span>
              </div>
              {totalStorage > 10 && (
                <div className="storage-warning">
                  <AlertTriangle size={16} />
                  <span>Large download size. Models will download in the background after installation.</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="model-selection-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!hasDefaultSelected || localSelected.length === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ModelSelection;

