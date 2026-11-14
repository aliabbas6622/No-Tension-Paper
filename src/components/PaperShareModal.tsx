import React from 'react';
import { ExamPaper } from '../types/exam';
import {
  X,
  Mail,
  Clock,
  HardDrive,
  Share2,
  FileText,
  ChevronRight,
  Edit3,
} from 'lucide-react';

interface PaperShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ExamPaper;
  onEmailNow: (paper: ExamPaper) => void;
  onScheduleEmail: (paper: ExamPaper) => void;
  onUploadAndShareDrive: (paper: ExamPaper) => void;
  onOpenInEditor?: (paper: ExamPaper) => void;
}

export const PaperShareModal: React.FC<PaperShareModalProps> = ({
  isOpen,
  onClose,
  paper,
  onEmailNow,
  onScheduleEmail,
  onUploadAndShareDrive,
  onOpenInEditor,
}) => {
  if (!isOpen) return null;

  const totalQuestions = paper.sections.reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-4 h-4 text-neutral-900 dark:text-white" />
            <div>
              <h3 className="font-semibold text-sm">Paper Ready — Deliver &amp; Share</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Email directly, schedule via Gmail, or upload to Google Drive &amp; share a link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white p-1 rounded-lg dark:hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Summary */}
        <div className="p-5 space-y-3 text-xs">
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-900 dark:text-white truncate">
                  {paper.header.subjectTitle || paper.title}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {paper.header.examinationTitle} • {paper.sections.length} Sections •{' '}
                  {totalQuestions} Questions
                </div>
              </div>
            </div>
            {onOpenInEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInEditor(paper);
                }}
                className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200 rounded-lg text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* 3 Delivery Options */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEmailNow(paper);
              }}
              className="w-full p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900 dark:hover:border-neutral-600 transition flex items-center justify-between gap-3 text-left cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white text-xs">
                    Email Paper Now via Gmail
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Send PDF, Word (.docx), or JSON attachment directly to coordinators or faculty
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-white shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onScheduleEmail(paper);
              }}
              className="w-full p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900 dark:hover:border-neutral-600 transition flex items-center justify-between gap-3 text-left cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-200/80 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white text-xs">
                    Schedule Gmail Send
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Choose a future date and time to send this exam paper automatically
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-white shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onUploadAndShareDrive(paper);
              }}
              className="w-full p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900 dark:hover:border-neutral-600 transition flex items-center justify-between gap-3 text-left cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-200/80 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white text-xs">
                    Upload to Google Drive &amp; Share Link
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Upload PDF/Word/JSON to Drive, generate a shareable link, or email the link
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-white shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-300 text-xs rounded-lg dark:hover:bg-neutral-800 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
