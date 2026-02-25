import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDailyUsage } from '../../hooks/useDailyUsage';
import { useDesigns } from '../../hooks/useDesigns';
import { API_URL, DEFAULT_INPUTS } from '../../constants';
import { validateInput, validateAllInputs } from '../../utils/validation';
import { downloadPDFFromBase64, formatDateForFilename } from '../../utils/pdfUtils';
import DesignForm from './DesignForm';
import QuickGuide from './QuickGuide';
import ResultsView from './ResultsView';
import CpVisualization from './CpVisualization';
import FlowVisualization from './FlowVisualization';
import PolarCharts from './PolarCharts';
import LoadingModal from '../common/LoadingModal';
import Header from '../layout/Header';
import LightRays from '../common/LightRays';

const AirfoilDesigner = ({ onShowHistory }) => {
  const { currentUser, logout, getIdToken } = useAuth();
  const { canGenerate, getRemainingGenerations, incrementUsage, loading: loadingUsage, dailyUsage } = useDailyUsage(currentUser);
  const { saveDesign } = useDesigns(currentUser);

  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [inputErrors, setInputErrors] = useState({});
  const [crafting, setCrafting] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);
  const [geometryData, setGeometryData] = useState(null); // Store airfoil geometry
  const [showCp, setShowCp] = useState(false); // Cp visualization modal
  const [showFlow, setShowFlow] = useState(false); // Flow visualization modal
  const [polarData, setPolarData] = useState(null); // Polar data from backend
  const [showPolars, setShowPolars] = useState(false); // Polar charts modal
  const [error, setError] = useState(null);

  const handleInputChange = (name, value) => {
    setInputs(prev => ({ ...prev, [name]: value }));
    const errors = validateInput(name, value);
    setInputErrors(prev => ({ ...prev, ...errors }));
  };

  const handleOptimize = async () => {
    if (!canGenerate()) {
      setError('Daily limit reached! Please come back tomorrow.');
      return;
    }

    if (!validateAllInputs(inputs)) {
      setError('Please fix input errors before optimizing');
      return;
    }

    setError(null);
    setCrafting(true);
    setPdfReady(false);
    setPdfData(null);
    setResultSummary(null);

    try {
      const idToken = await getIdToken();
      const response = await fetch(`${API_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` })
        },
        body: JSON.stringify({ ...inputs })
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before trying again.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Optimization failed');
      }

      const data = await response.json();

      await incrementUsage();

      try {
        await saveDesign({
          inputs: inputs,
          results: data.aerodynamics,
          pdfBase64: data.pdf_data
        });
      } catch (saveErr) {
        console.error('Failed to save design:', saveErr);
      }

      setPdfData(data.pdf_data);
      setResultSummary(data.aerodynamics);
      setGeometryData(data.geometry); // Store geometry for Cp visualization
      setPolarData(data.polar || null); // Store polar data for interactive charts
      setPdfReady(true);
    } catch (err) {
      setError(err.message);
      console.error('Optimization error:', err);
    } finally {
      setCrafting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfData) return;
    const filename = `airfoil_design_${formatDateForFilename(new Date())}.pdf`;
    const success = downloadPDFFromBase64(pdfData, filename);
    if (!success) {
      setError('Failed to download PDF');
    }
  };

  const handleNewDesign = () => {
    setPdfReady(false);
    setPdfData(null);
    setResultSummary(null);
    setError(null);
    setInputs(DEFAULT_INPUTS);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden animate-fade-in">
      <LightRays
        raysOrigin="top-center"
        raysColor="#06b6d4"
        raysSpeed={0.5}
        lightSpread={2.5}
        rayLength={1.5}
        pulsating={false}
        fadeDistance={0.8}
        saturation={0.8}
        followMouse={true}
        mouseInfluence={0.08}
        noiseAmount={0.05}
        distortion={0.1}
      />

      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0 animate-fade-in" style={{
        backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <Header
        currentUser={currentUser}
        dailyUsage={dailyUsage}
        loadingUsage={loadingUsage}
        getRemainingGenerations={getRemainingGenerations}
        onHistoryClick={onShowHistory}
        onLogout={logout}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-fade-in-up">
          {!pdfReady ? (
            <div className="grid lg:grid-cols-5 gap-4 sm:gap-6 stagger-children">
              <div className="lg:col-span-3 animate-fade-in-up">
                <DesignForm
                  inputs={inputs}
                  inputErrors={inputErrors}
                  onInputChange={handleInputChange}
                  onSubmit={handleOptimize}
                  canGenerate={canGenerate}
                  isLoading={crafting}
                  error={error}
                  getRemainingGenerations={getRemainingGenerations}
                />
              </div>

              <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <QuickGuide
                  dailyUsage={dailyUsage}
                  getRemainingGenerations={getRemainingGenerations}
                />
              </div>
            </div>
          ) : (
            <ResultsView
              results={resultSummary}
              onDownload={handleDownloadPDF}
              onNewDesign={handleNewDesign}
              onViewCp={() => setShowCp(true)}
              onViewFlow={() => setShowFlow(true)}
              onViewPolars={() => setShowPolars(true)}
              canGenerate={canGenerate}
              getRemainingGenerations={getRemainingGenerations}
            />
          )}
        </div>
      </div>

      <LoadingModal isVisible={crafting} />
      
      {/* Cp Visualization Modal */}
      {showCp && geometryData && resultSummary && (
        <CpVisualization
          airfoilData={geometryData}
          alpha={inputs.alpha}
          mach={inputs.mach}
          onClose={() => setShowCp(false)}
        />
      )}

      {/* Flow Visualization Modal */}
      {showFlow && geometryData && resultSummary && (
        <FlowVisualization
          airfoilData={geometryData}
          alpha={inputs.alpha}
          onClose={() => setShowFlow(false)}
        />
      )}

      {/* Interactive Polar Charts Modal */}
      {showPolars && polarData && resultSummary && (
        <PolarCharts
          polarData={polarData}
          designPoint={resultSummary}
          alpha={inputs.alpha}
          onClose={() => setShowPolars(false)}
        />
      )}
    </div>
  );
};

export default AirfoilDesigner;