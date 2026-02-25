import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDesigns } from '../hooks/useDesigns';
import AirfoilDesigner from './design/AirfoilDesigner';
import HistoryModal from './design/HistoryModal';
import DesignComparison from './design/DesignComparison';

const AirfoilGarage = () => {
  const { currentUser } = useAuth();
  const { designs, loading, loadDesigns, deleteDesign } = useDesigns(currentUser);
  const [showHistory, setShowHistory] = useState(false);
  const [currentView, setCurrentView] = useState('designer'); // 'designer' | 'comparison'
  const [selectedDesigns, setSelectedDesigns] = useState([]);

  const handleShowHistory = () => {
    setShowHistory(true);
    loadDesigns();
  };

  const handleShowComparison = (designsToCompare) => {
    setSelectedDesigns(designsToCompare);
    setCurrentView('comparison');
    setShowHistory(false);
  };

  const handleBackToDesigner = () => {
    setCurrentView('designer');
    setSelectedDesigns([]);
  };

  return (
    <>
      {currentView === 'designer' ? (
        <>
          <AirfoilDesigner onShowHistory={handleShowHistory} />
          <HistoryModal
            isOpen={showHistory}
            designs={designs}
            loading={loading}
            onClose={() => setShowHistory(false)}
            onDelete={deleteDesign}
            onShowComparison={handleShowComparison}
          />
        </>
      ) : (
        <DesignComparison
          designs={selectedDesigns}
          onClose={handleBackToDesigner}
        />
      )}
    </>
  );
};

export default AirfoilGarage;