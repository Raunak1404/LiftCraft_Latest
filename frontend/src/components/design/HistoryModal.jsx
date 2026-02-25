import React, { useState } from 'react';
import { X, Clock, Download, GitCompare, FileText, Trash2, Zap } from 'lucide-react';
import { downloadPDFFromBase64, formatDateForFilename } from '../../utils/pdfUtils';

const HistoryModal = ({ isOpen, designs, loading, onClose, onDelete, onShowComparison }) => {
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedDesigns, setSelectedDesigns] = useState([]);

  if (!isOpen) return null;

  const toggleDesignSelection = (design) => {
    setSelectedDesigns(prev => {
      const isSelected = prev.find(d => d.id === design.id);
      if (isSelected) {
        return prev.filter(d => d.id !== design.id);
      } else if (prev.length < 3) {
        return [...prev, design];
      } else {
        alert('Maximum 3 designs can be compared');
        return prev;
      }
    });
  };

  const startComparison = () => {
    if (selectedDesigns.length < 2) {
      alert('Please select at least 2 designs to compare');
      return;
    }
    onShowComparison(selectedDesigns);
  };

  const handleDownloadPDF = (design) => {
    try {
      const filename = `airfoil_design_${formatDateForFilename(design.createdAt.toDate())}.pdf`;
      downloadPDFFromBase64(design.pdfBase64, filename);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF');
    }
  };

  const handleDelete = async (designId) => {
    if (confirm('Delete this design?')) {
      try {
        await onDelete(designId);
      } catch (err) {
        alert('Failed to delete design');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-modal-backdrop">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-modal-content">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-cyan-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/50">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <Zap className="w-7 h-7 text-cyan-400" />
              <div className="absolute inset-0 blur-xl bg-cyan-400/30" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gradient">
              Design History
            </h2>
            {comparisonMode && (
              <span className="text-xs sm:text-sm text-cyan-300 bg-cyan-500/20 px-2 sm:px-3 py-1 rounded-full border border-cyan-500/30 animate-scale-in-bounce tabular-nums">
                {selectedDesigns.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!comparisonMode ? (
              <button
                onClick={() => setComparisonMode(true)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition-all btn-press flex items-center justify-center gap-2 text-sm"
              >
                <GitCompare className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Compare Designs</span>
              </button>
            ) : (
              <>
                <button
                  onClick={startComparison}
                  disabled={selectedDesigns.length < 2}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-press flex items-center justify-center gap-2 text-sm"
                >
                  <GitCompare className="w-4 h-4 sm:w-5 sm:h-5" />
                  Compare ({selectedDesigns.length})
                </button>
                <button
                  onClick={() => { setComparisonMode(false); setSelectedDesigns([]); }}
                  className="px-3 sm:px-4 py-2 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all btn-press text-sm"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-all btn-press"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Zap className="w-16 h-16 text-cyan-400 animate-breathe" />
                <div className="absolute inset-0 blur-2xl bg-cyan-400/30 animate-breathe" />
              </div>
              <p className="text-cyan-300 text-sm sm:text-base mt-4">Loading designs...</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-20 animate-fade-in-up">
              <FileText className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-400/30 mx-auto mb-4" />
              <p className="text-cyan-300/70 text-base sm:text-lg">No designs yet</p>
              <p className="text-cyan-400/50 text-xs sm:text-sm mt-2">Create your first airfoil design to get started</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 stagger-children">
              {designs.map((design, index) => {
                const isSelected = selectedDesigns.find(d => d.id === design.id);

                return (
                  <div
                    key={design.id}
                    className={`glass-effect border rounded-xl p-3 sm:p-4 transition-all duration-200 animate-fade-in-up ${
                      comparisonMode ? 'cursor-pointer hover:border-cyan-400/60' : 'hover:border-cyan-400/40'
                    } ${
                      isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-cyan-500/10' : 'border-cyan-500/20'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => comparisonMode && toggleDesignSelection(design)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {comparisonMode && (
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => toggleDesignSelection(design)}
                            className="w-4 h-4 sm:w-5 sm:h-5 rounded border-cyan-500/50 text-cyan-500 focus:ring-2 focus:ring-cyan-400/50 bg-slate-700 cursor-pointer accent-cyan-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex items-center gap-2 text-cyan-400/70 text-xs sm:text-sm">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">{design.createdAt?.toDate().toLocaleString()}</span>
                          <span className="sm:hidden">{design.createdAt?.toDate().toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(design); }}
                          className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 rounded-lg hover:bg-emerald-600/30 transition-all btn-press text-xs sm:text-sm flex items-center justify-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(design.id); }}
                          className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 bg-red-600/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-600/30 transition-all btn-press text-xs sm:text-sm flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Design Parameters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div>
                        <p className="text-cyan-400/70">CL Target</p>
                        <p className="text-white font-semibold tabular-nums">{design.inputs?.CL_target?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-cyan-400/70">Alpha</p>
                        <p className="text-white font-semibold tabular-nums">{design.inputs?.alpha?.toFixed(1)}&deg;</p>
                      </div>
                      <div>
                        <p className="text-cyan-400/70">Reynolds</p>
                        <p className="text-white font-semibold tabular-nums">{design.inputs?.Re?.toExponential(1)}</p>
                      </div>
                      <div>
                        <p className="text-cyan-400/70">Type</p>
                        <p className="text-white font-semibold capitalize">{design.inputs?.airfoil_type}</p>
                      </div>
                    </div>

                    {/* Results */}
                    {design.results && (
                      <div className="mt-3 pt-3 border-t border-cyan-500/20 grid grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div>
                          <p className="text-cyan-400/70">CL</p>
                          <p className="text-cyan-300 font-bold tabular-nums">{design.results.CL?.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-cyan-400/70">CD</p>
                          <p className="text-cyan-300 font-bold tabular-nums">{design.results.CD?.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-cyan-400/70">L/D</p>
                          <p className="text-cyan-300 font-bold tabular-nums">{design.results.LD?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-cyan-400/70">CM</p>
                          <p className="text-cyan-300 font-bold tabular-nums">{design.results.CM?.toFixed(4)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
