import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TitleBar from './components/TitleBar';
import SplashScreen from './pages/SplashScreen';
import LicenseAgreement from './pages/LicenseAgreement';
import InstallationLocation from './pages/InstallationLocation';
import ModelSelection from './pages/ModelSelection';
import InstallationProgress from './pages/InstallationProgress';
import Completion from './pages/Completion';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [wizardData, setWizardData] = useState({
    licenseAccepted: false,
    installPath: '',
    selectedModels: [],
    systemInfo: null
  });

  useEffect(() => {
    // Auto-advance from splash screen
    if (currentPage === 0) {
      const timer = setTimeout(() => {
        setCurrentPage(1);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  const updateWizardData = (updates) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const nextPage = () => {
    if (currentPage < 5) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const pages = [
    <SplashScreen key="splash" />,
    <LicenseAgreement 
      key="license"
      accepted={wizardData.licenseAccepted}
      onAccept={(accepted) => {
        updateWizardData({ licenseAccepted: accepted });
        if (accepted) nextPage();
      }}
      onNext={nextPage}
      onBack={prevPage}
    />,
    <InstallationLocation
      key="location"
      installPath={wizardData.installPath}
      onPathChange={(path) => updateWizardData({ installPath: path })}
      onNext={nextPage}
      onBack={prevPage}
    />,
    <ModelSelection
      key="models"
      systemInfo={wizardData.systemInfo}
      selectedModels={wizardData.selectedModels}
      onModelsChange={(models) => updateWizardData({ selectedModels: models })}
      onSystemInfoLoaded={(info) => updateWizardData({ systemInfo: info })}
      onNext={nextPage}
      onBack={prevPage}
    />,
    <InstallationProgress
      key="progress"
      installPath={wizardData.installPath}
      selectedModels={wizardData.selectedModels}
      onComplete={nextPage}
      onBack={prevPage}
    />,
    <Completion
      key="completion"
      installPath={wizardData.installPath}
      selectedModels={wizardData.selectedModels}
    />
  ];

  return (
    <div className="app">
      <TitleBar />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="page-container"
        >
          {pages[currentPage]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;

