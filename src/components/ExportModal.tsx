import React, { useState } from 'react';
import { ExamPaper } from '../types/exam';
import { exportPaperToWord } from '../services/wordExport';
import { downloadPaperAsPDF, printPaperDirect } from '../services/pdfExport';
import {
  X,
  FileDown,
  Printer,
  FileText,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Share2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ExamPaper;
  onOpenGoogleDocs: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  paper,
  onOpenGoogleDocs,
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    setErrorMessage(null);
    try {
      await downloadPaperAsPDF(paper);
      setSuccessMessage('PDF file generated and downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to generate PDF file.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrintSystem = () => {
    printPaperDirect();
  };

  const handleDownloadWord = async () => {
    setIsExportingWord(true);
    setErrorMessage(null);
    try {
      const filename = await exportPaperToWord(paper);
      setSuccessMessage(`Word document "${filename}" downloaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to generate Word document.');
    } finally {
      setIsExportingWord(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-black border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-semibold text-sm">Export & Download Exam Paper</h3>
              <p className="text-[11px] text-neutral-400">
                Choose your preferred file format for printing, sharing, or editing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banners */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-neutral-900 border border-neutral-700 rounded-xl flex items-center gap-2 text-white text-xs font-medium">
            <Check className="w-4 h-4 text-white shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-neutral-900 border border-neutral-700 rounded-xl flex items-start gap-2 text-white text-xs">
            <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Export Notice: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Export Options Grid */}
        <div className="p-5 space-y-3">
          {/* 1. PDF File Download & Print */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-white" />
                  <span>PDF Document (.pdf)</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Exact standard A4 examination layout. Perfect for physical printing and digital distribution.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDownloadPDF}
                disabled={isExportingPDF}
                className="flex-1 py-2 px-3 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5 text-black" />
                    <span>Download PDF File</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrintSystem}
                className="py-2 px-3 bg-neutral-900 border border-neutral-700 text-white font-medium text-xs rounded-lg hover:bg-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Open browser print dialog"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>System Print</span>
              </button>
            </div>
          </div>

          {/* 2. Microsoft Word Document (.docx) */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-3">
            <div>
              <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                <FileDown className="w-4 h-4 text-white" />
                <span>Microsoft Word Document (.docx)</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Editable Word file with headers, 2-column MCQ tables, and question styling.
              </p>
            </div>

            <button
              onClick={handleDownloadWord}
              disabled={isExportingWord}
              className="w-full py-2 px-3 bg-neutral-900 border border-neutral-700 text-white font-semibold text-xs rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isExportingWord ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Generating Word File...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-white" />
                  <span>Download Word Document (.docx)</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Google Docs Export */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-3">
            <div>
              <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-white" />
                <span>Google Docs & Google Drive</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Create and save this exam paper directly into your Google Drive account.
              </p>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenGoogleDocs();
              }}
              className="w-full py-2 px-3 bg-neutral-900 border border-neutral-700 text-white font-semibold text-xs rounded-lg hover:bg-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Export to Google Docs</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-neutral-300 text-xs rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
