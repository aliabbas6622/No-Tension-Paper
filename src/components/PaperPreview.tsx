import React, { useState } from 'react';
import { ExamPaper } from '../types/exam';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  Printer,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface PaperPreviewProps {
  paper: ExamPaper;
  onPrint: () => void;
}

export const PaperPreview: React.FC<PaperPreviewProps> = ({ paper, onPrint }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState(false);
  const [showAnswerKeys, setShowAnswerKeys] = useState(false);

  const { header, sections, settings } = paper;

  const totalAnswersInPaper = sections.reduce(
    (acc, sec) => acc + sec.questions.filter((q) => Boolean(q.answerKey)).length,
    0
  );

  const fontClass =
    settings.fontFamily === 'sans'
      ? 'font-sans'
      : settings.fontFamily === 'classic'
      ? 'font-exam-classic'
      : 'font-exam-serif';

  const handleCopyText = () => {
    let text = `${header.examinationTitle}\n${header.examinationMonth}\n${header.groupName}\n${header.subjectTitle}\n`;
    text += `Date: ${header.date}   Duration: ${header.duration}   Max. Marks: ${header.maxMarks}\n`;
    text += '------------------------------------------------------------------\n\n';

    if (settings.showGeneralInstructions !== false && header.generalInstructions?.length) {
      text += `Instructions: ${header.generalInstructions.join(' | ')}\n\n`;
    }

    sections.forEach((sec) => {
      if (settings.showDividerMarker !== false) {
        text += '|\n';
      }
      text += `${sec.name}\n${sec.subtitle}    [ ${sec.marksBadge} ]\n`;
      if (settings.showSectionInstructions !== false && sec.instruction) {
        text += `${sec.instruction}\n\n`;
      }
      sec.questions.forEach((q) => {
        const marksStr =
          settings.showQuestionMarks !== false && q.marks && q.type !== 'mcq'
            ? ` (${q.marks} Marks)`
            : '';
        text += `${q.number} ${q.text}${marksStr}\n`;
        if (q.type === 'mcq' && q.options) {
          if (q.options.length === 4) {
            text += `  ${q.options[0].label} ${q.options[0].text}        ${q.options[2].label} ${q.options[2].text}\n`;
            text += `  ${q.options[1].label} ${q.options[1].text}        ${q.options[3].label} ${q.options[3].text}\n`;
          } else {
            q.options.forEach((opt) => {
              text += `  ${opt.label} ${opt.text}\n`;
            });
          }
        }
        text += '\n';
      });
    });

    if (settings.showEndOfPaper !== false) {
      text += '*** END OF EXAMINATION PAPER ***\n';
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-neutral-950 text-white min-w-0">
      {/* Ultra-Minimal Monochrome Preview Toolbar */}
      <div className="no-print h-10 px-4 bg-black border-b border-neutral-800 flex items-center justify-between gap-2 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
            Real-Time Paper Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Answer Key Toggle Button (if paper has answer keys) */}
          {totalAnswersInPaper > 0 && (
            <button
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className={`p-1 px-2 rounded transition flex items-center gap-1 text-[11px] cursor-pointer ${
                showAnswerKeys
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800'
              }`}
              title="Toggle display of Answer Keys from curriculum"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Keys ({totalAnswersInPaper})</span>
            </button>
          )}

          {/* Copy Plaintext button */}
          <button
            onClick={handleCopyText}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition flex items-center gap-1 text-[11px] cursor-pointer"
            title="Copy paper as text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-neutral-900 rounded p-0.5 border border-neutral-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(65, z - 10))}
              className="p-1 text-neutral-400 hover:text-white rounded transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 text-[10px] font-mono text-neutral-300">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="p-1 text-neutral-400 hover:text-white rounded transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Independent Paper Scroll Area: ONLY this area scrolls when user moves mouse here */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start bg-neutral-950">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-100 w-full max-w-[820px] pb-16"
        >
          {/* Printable White Exam Sheet (Black text on crisp white authentic paper) */}
          <div
            id="printable-exam-paper"
            className={`w-full min-h-[1050px] p-8 sm:p-12 rounded-sm shadow-2xl bg-white text-black border border-neutral-300 ${fontClass}`}
          >
            {/* Optional Institution */}
            {header.institutionName && (
              <div className="text-center font-bold text-base sm:text-lg tracking-wide uppercase mb-1">
                {header.institutionName}
              </div>
            )}

            {/* Header Titles (Exact user Image 1 format) */}
            <div className="text-center space-y-1 mb-4">
              <div className="font-bold text-sm sm:text-base tracking-wider uppercase">
                {header.examinationTitle || 'INTERMEDIATE EXAMINATION 2026-27'}
              </div>
              <div className="text-xs sm:text-sm tracking-wide uppercase">
                {header.examinationMonth || 'EXAMINATION MONTH: OCT-25'}
              </div>
              <div className="text-xs sm:text-sm tracking-wide uppercase">
                {header.groupName || 'COMPUTER SCIENCE GROUP'}
              </div>
              <div className="font-bold text-sm sm:text-base tracking-wide uppercase pt-0.5">
                {header.subjectTitle || 'SUBJECT: COMPUTER PAPER II'}
              </div>
            </div>

            {/* Metadata Row: Date, Duration, Max Marks */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-2 pb-1 border-b border-black font-medium">
              <div>Date: {header.date || '___'}</div>
              <div>Duration: {header.duration || '2 Hour'}</div>
              <div>Max. Marks: {header.maxMarks || '50'}</div>
            </div>

            {/* General Instructions (if enabled) */}
            {settings.showGeneralInstructions !== false &&
              header.generalInstructions &&
              header.generalInstructions.length > 0 && (
                <div className="my-3 text-xs italic opacity-85 border-b border-neutral-300 pb-2">
                  <span className="font-bold">Instructions: </span>
                  {header.generalInstructions.join(' | ')}
                </div>
              )}

            {/* Sections */}
            <div className="mt-6 space-y-8">
              {sections.map((section) => (
                <div key={section.id} className="avoid-break space-y-3">
                  {/* Top vertical divider marker '|' (if enabled) */}
                  {settings.showDividerMarker !== false && (
                    <div className="text-center text-sm font-bold opacity-80 leading-none">
                      |
                    </div>
                  )}

                  {/* Section Title, Subtitle, and Right Marks Box (matching Image 1) */}
                  <div className="relative flex items-center justify-center min-h-[44px]">
                    <div className="text-center">
                      <h2 className="text-sm sm:text-base font-bold underline tracking-wide uppercase">
                        {section.name}
                      </h2>
                      <h3 className="text-xs sm:text-sm font-bold underline tracking-wide uppercase mt-0.5">
                        {section.subtitle}
                      </h3>
                    </div>

                    {/* Right-aligned boxed marks badge (e.g. '10 Marks') */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 border border-black px-3 py-1 text-xs sm:text-sm font-bold shadow-xs whitespace-nowrap">
                      {section.marksBadge}
                    </div>
                  </div>

                  {/* Section Sub-Instruction (if enabled) */}
                  {settings.showSectionInstructions !== false && section.instruction && (
                    <div className="font-bold text-xs sm:text-sm pt-1">
                      {section.instruction}
                    </div>
                  )}

                  {/* Questions List */}
                  <div className="space-y-4 pt-1">
                    {section.questions.map((q) => (
                      <div key={q.id} className="avoid-break text-xs sm:text-sm leading-relaxed">
                        {/* Question Prompt */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold inline-block mr-1.5">{q.number}</span>
                            <span>{q.text}</span>
                          </div>
                          {/* Marks Note (if enabled) */}
                          {settings.showQuestionMarks !== false && q.marks && q.type !== 'mcq' && (
                            <span className="font-bold shrink-0 ml-2">
                              [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
                            </span>
                          )}
                        </div>

                        {/* MCQ Options Display: 2 Columns */}
                        {q.type === 'mcq' && q.options && q.options.length > 0 && (
                          <div className="mt-1.5 pl-4 sm:pl-6">
                            {q.options.length === 4 && q.optionColumns !== 4 ? (
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-medium">{q.options[0].label}</span>
                                  <span>{q.options[0].text}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-medium">{q.options[2].label}</span>
                                  <span>{q.options[2].text}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-medium">{q.options[1].label}</span>
                                  <span>{q.options[1].text}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-medium">{q.options[3].label}</span>
                                  <span>{q.options[3].text}</span>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`grid ${
                                  q.optionColumns === 4 ? 'grid-cols-4' : 'grid-cols-2'
                                } gap-x-4 gap-y-1`}
                              >
                                {q.options.map((opt) => (
                                  <div key={opt.id} className="flex items-baseline gap-1.5">
                                    <span className="font-medium">{opt.label}</span>
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Model Answer / Answer Key (Visible when Answer Keys toggle is turned ON) */}
                        {showAnswerKeys && q.answerKey && (
                          <div className="mt-1.5 p-1.5 px-2 bg-neutral-100 border border-neutral-300 rounded text-[11px] font-sans text-neutral-800 flex items-baseline gap-1.5">
                            <span className="font-bold uppercase tracking-wider text-[10px] bg-black text-white px-1.5 py-0.2 rounded">
                              Answer Key
                            </span>
                            <span className="font-medium">{q.answerKey}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* End of Paper Sign-off (if enabled) */}
            {settings.showEndOfPaper !== false && (
              <div className="mt-14 pt-4 border-t border-black/40 text-center space-y-1">
                <div className="text-xs tracking-widest uppercase font-bold">
                  *** END OF EXAMINATION PAPER ***
                </div>
                <div className="text-[10px] opacity-60">
                  Intermediate Examination Board • Official Format
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
