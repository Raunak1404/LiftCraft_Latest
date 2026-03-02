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
    <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto animate-modal-backdrop">
      <div className="surface-card-elevated border border-violet-500/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/5 flex flex-col animate-modal-content">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/[0.04] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#06060a]/50">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <Zap className="w-6 h-6 text-violet-400" />
              <div className="absolute inset-0 blur-xl bg-violet-500/25" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gradient tracking-tight">
              Design History
            </h2>
            {comparisonMode && (
              <span className="text-xs text-violet-300 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20 animate-scale-in-bounce tabular-nums font-medium">
                {selectedDesigns.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!comparisonMode ? (
              <button
                onClick={() => setComparisonMode(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/20 transition-all btn-press flex items-center justify-center gap-2 text-sm"
              >
                <GitCompare className="w-4 h-4" />
                <span>Compare Designs</span>
              </button>
            ) : (
              <>
                <button
                  onClick={startComparison}
                  disabled={selectedDesigns.length < 2}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-press flex items-center justify-center gap-2 text-sm"
                >
                  <GitCompare className="w-4 h-4" />
                  Compare ({selectedDesigns.length})
                </button>
                <button
                  onClick={() => { setComparisonMode(false); setSelectedDesigns([]); }}
                  className="px-4 py-2 bg-white/[0.04] text-white font-semibold rounded-xl hover:bg-white/[0.06] transition-all btn-press text-sm border border-white/[0.06]"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/[0.04] rounded-xl transition-all btn-press"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Zap className="w-14 h-14 text-violet-400 animate-breathe" />
                <div className="absolute inset-0 blur-2xl bg-violet-500/25 animate-breathe" />
              </div>
              <p className="text-violet-300/80 text-sm mt-4 font-medium">Loading designs...</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-20 animate-fade-in-up">
              <FileText className="w-16 h-16 text-violet-400/20 mx-auto mb-4" />
              <p className="text-zinc-400 text-base">No designs yet</p>
              <p className="text-zinc-600 text-sm mt-2">Create your first airfoil design to get started</p>
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {designs.map((design, index) => {
                const isSelected = selectedDesigns.find(d => d.id === design.id);

                return (
                  <div
                    key={design.id}
                    className={`surface-card border rounded-xl p-3 sm:p-4 transition-all duration-200 animate-fade-in-up ${
                      comparisonMode ? 'cursor-pointer hover:border-violet-400/30' : 'hover:border-violet-400/20'
                    } ${
                      isSelected ? 'border-violet-400/50 ring-1 ring-violet-400/20 bg-violet-500/[0.04]' : 'border-white/[0.04]'
                    }`}
                    style={{ animationDelay: `${index * 40}ms` }}
                    onClick={() => comparisonMode && toggleDesignSelection(design)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        {comparisonMode && (
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => toggleDesignSelection(design)}
                            className="w-4 h-4 rounded border-violet-500/40 text-violet-500 focus:ring-2 focus:ring-violet-400/30 bg-white/[0.03] cursor-pointer accent-violet-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex items-center gap-2 text-zinc-600 text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{design.createdAt?.toDate().toLocaleString()}</span>
                          <span className="sm:hidden">{design.createdAt?.toDate().toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(design); }}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/15 text-emerald-300 rounded-lg hover:bg-emerald-500/12 transition-all btn-press text-xs flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(design.id); }}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-500/8 border border-rose-500/15 text-rose-300 rounded-lg hover:bg-rose-500/12 transition-all btn-press text-xs flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Design Parameters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <p className="text-zinc-600 font-medium">CL Target</p>
                        <p className="text-white font-semibold tabular-nums">{design.inputs?.CL_target?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-600 font-medium">Alpha</p>
                        <p className="text-white font-semibold tabular-nums">{design.inputs?.alpha?.toFixed(1)}&deg;</p>
                      </div>
                      <div>
                        <p className="text-zinc-600 font-medium">Reynolds</p>
                        <p className="text-white font-semibold tabular-nums">{design.inputs?.Re?.toExponential(1)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-600 font-medium">Type</p>
                        <p className="text-white font-semibold capitalize">{design.inputs?.airfoil_type}</p>
                      </div>
                    </div>

                    {/* Results */}
                    {design.results && (
                      <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-4 gap-2.5 text-xs">
                        <div>
                          <p className="text-zinc-600 font-medium">CL</p>
                          <p className="text-violet-300 font-bold tabular-nums">{design.results.CL?.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600 font-medium">CD</p>
                          <p className="text-emerald-300 font-bold tabular-nums">{design.results.CD?.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600 font-medium">L/D</p>
                          <p className="text-amber-300 font-bold tabular-nums">{design.results.LD?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600 font-medium">CM</p>
                          <p className="text-rose-300 font-bold tabular-nums">{design.results.CM?.toFixed(4)}</p>
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
