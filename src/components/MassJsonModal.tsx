import React, { useState } from 'react';
import { Question, QuestionType, ExamSection } from '../types/exam';
import {
  X,
  Copy,
  Check,
  Code2,
  FileDown,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

interface MassJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: ExamSection | undefined;
  onImportQuestions: (questions: Question[], mode: 'append' | 'replace') => void;
}

export const SAMPLE_QUESTIONS_JSON = JSON.stringify(
  [
    {
      number: 'i.',
      type: 'mcq',
      text: 'Which gate produces an output 1 only when all inputs are 1?',
      marks: 1,
      optionColumns: 2,
      options: [
        { label: '(a)', text: 'OR gate' },
        { label: '(b)', text: 'AND gate' },
        { label: '(c)', text: 'NOT gate' },
        { label: '(d)', text: 'NOR gate' },
      ],
    },
    {
      number: 'ii.',
      type: 'short',
      text: 'Differentiate between Synchronous and Asynchronous transmission with examples.',
      marks: 4,
    },
    {
      number: 'iii.',
      type: 'detailed',
      text: 'Explain the OSI Reference Model with detailed responsibilities of all 7 layers.',
      marks: 8,
    },
  ],
  null,
  2
);

export const MassJsonModal: React.FC<MassJsonModalProps> = ({
  isOpen,
  onClose,
  section,
  onImportQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [jsonInput, setJsonInput] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [copiedSample, setCopiedSample] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<Question[] | null>(null);

  if (!isOpen || !section) return null;

  // Format section questions for export
  const exportableQuestions = section.questions.map((q) => ({
    number: q.number,
    type: q.type,
    text: q.text,
    marks: q.marks || (q.type === 'mcq' ? 1 : q.type === 'short' ? 4 : 8),
    ...(q.type === 'mcq' && q.options
      ? {
          options: q.options.map((opt) => ({
            label: opt.label,
            text: opt.text,
          })),
          optionColumns: q.optionColumns || 2,
        }
      : {}),
  }));

  const exportJsonString = JSON.stringify(exportableQuestions, null, 2);

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_QUESTIONS_JSON);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handlePasteSampleIntoInput = () => {
    setJsonInput(SAMPLE_QUESTIONS_JSON);
    validateJson(SAMPLE_QUESTIONS_JSON);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportJsonString);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleDownloadExportJson = () => {
    const blob = new Blob([exportJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${section.name.replace(/[^a-zA-Z0-9]/g, '_')}_questions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Validate and parse JSON
  const validateJson = (input: string) => {
    if (!input.trim()) {
      setValidationError(null);
      setParsedQuestions(null);
      return;
    }

    try {
      const sanitized = input
        .replace(/<--[^\n\r]*/g, '')
        .replace(/^\s*\/\/[^\n\r]*$/gm, '')
        .trim();

      const parsed = JSON.parse(sanitized);
      let items: any[] = [];

      if (parsed && Array.isArray(parsed.curriculum_answers)) {
        parsed.curriculum_answers.forEach((unit: any) => {
          if (Array.isArray(unit.sections)) {
            unit.sections.forEach((sec: any) => {
              if (Array.isArray(sec.questions)) {
                const secTypeLower = String(sec.type || '').toLowerCase();
                sec.questions.forEach((q: any) => {
                  const isMcq =
                    secTypeLower.includes('mcq') ||
                    secTypeLower.includes('encircle') ||
                    secTypeLower.includes('choice') ||
                    (q.options && q.options.length > 0);
                  const isDetailed =
                    secTypeLower.includes('detailed') ||
                    secTypeLower.includes('long') ||
                    secTypeLower.includes('essay');
                  items.push({
                    number: q.question_number ? `${q.question_number}.` : undefined,
                    text: q.question || q.text,
                    type: isMcq ? 'mcq' : isDetailed ? 'detailed' : 'short',
                    options: q.options,
                    answerKey: q.answer || q.answerKey,
                  });
                });
              }
            });
          }
        });
      } else if (Array.isArray(parsed)) {
        items = parsed;
      } else if (Array.isArray(parsed.questions)) {
        items = parsed.questions;
      }

      if (!items || items.length === 0) {
        setValidationError('Input must be a JSON array of questions, e.g. [ { ... }, { ... } ] or { "curriculum_answers": [ ... ] }');
        setParsedQuestions(null);
        return;
      }

      const validated: Question[] = [];
      const romanNumerals = [
        'i.',
        'ii.',
        'iii.',
        'iv.',
        'v.',
        'vi.',
        'vii.',
        'viii.',
        'ix.',
        'x.',
        'xi.',
        'xii.',
        'xiii.',
        'xiv.',
        'xv.',
        'xvi.',
        'xvii.',
        'xviii.',
        'xix.',
        'xx.',
      ];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== 'object') {
          throw new Error(`Item at index ${i} is not a valid question object.`);
        }
        const resolvedText = item.text || item.question;
        if (!resolvedText || typeof resolvedText !== 'string') {
          throw new Error(`Question at index ${i} is missing required string "text".`);
        }

        // Normalize type
        let rawType = String(item.type || 'short').toLowerCase();
        let qType: QuestionType = 'short';
        if (rawType === 'mcq' || rawType === 'multiple_choice') qType = 'mcq';
        else if (rawType === 'detailed' || rawType === 'long') qType = 'detailed';
        else if (rawType === 'fill_blank') qType = 'fill_blank';
        else if (rawType === 'true_false') qType = 'true_false';

        // Options for MCQ
        let opts = undefined;
        if (qType === 'mcq') {
          if (Array.isArray(item.options) && item.options.length > 0) {
            opts = item.options.map((opt: any, optIdx: number) => {
              const defaultLabels = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)'];
              const optId = 'opt-' + Date.now() + '-' + i + '-' + optIdx;
              if (typeof opt === 'string') {
                const match = opt.trim().match(/^\s*(\([a-zA-Z0-9]+\)|[a-zA-Z0-9]+[.)])\s*(.*)$/);
                if (match) {
                  const lbl = match[1].startsWith('(') ? match[1] : `(${match[1].replace(/[.)]/, '')})`;
                  return { id: optId, label: lbl, text: match[2].trim() };
                }
                return { id: optId, label: defaultLabels[optIdx] || `(${optIdx + 1})`, text: opt.trim() };
              }
              return {
                id: optId,
                label: opt?.label || defaultLabels[optIdx] || `(${optIdx + 1})`,
                text: String(opt?.text || ''),
              };
            });
          } else {
            // Default options if omitted
            opts = [
              { id: 'opt-a-' + Date.now() + '-' + i, label: '(a)', text: 'Option A' },
              { id: 'opt-b-' + Date.now() + '-' + i, label: '(b)', text: 'Option B' },
              { id: 'opt-c-' + Date.now() + '-' + i, label: '(c)', text: 'Option C' },
              { id: 'opt-d-' + Date.now() + '-' + i, label: '(d)', text: 'Option D' },
            ];
          }
        }

        const resolvedAnswerKey = item.answerKey || item.answer;
        validated.push({
          id: 'q-mass-' + Date.now() + '-' + i,
          number: item.number || romanNumerals[i] || `${i + 1}.`,
          type: qType,
          text: resolvedText.trim(),
          marks: Number(item.marks) || (qType === 'mcq' ? 1 : qType === 'short' ? 4 : 8),
          optionColumns: item.optionColumns === 4 ? 4 : 2,
          options: opts,
          ...(resolvedAnswerKey ? { answerKey: String(resolvedAnswerKey) } : {}),
        });
      }

      setValidationError(null);
      setParsedQuestions(validated);
    } catch (err: any) {
      setValidationError(err.message || 'Invalid JSON syntax');
      setParsedQuestions(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonInput(val);
    validateJson(val);
  };

  const handleExecuteImport = () => {
    if (!parsedQuestions || parsedQuestions.length === 0) return;
    onImportQuestions(parsedQuestions, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-neutral-900 dark:text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Bulk Questions via JSON</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Mass add or export questions for {section.name}
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

        {/* Tab Switcher */}
        <div className="px-5 pt-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5 bg-white dark:bg-black">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900'
              }`}
            >
              Import JSON
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900'
              }`}
            >
              Export Current Questions ({section.questions.length})
            </button>
          </div>

          {activeTab === 'import' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Mode:</span>
              <button
                onClick={() => setImportMode('append')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  importMode === 'append'
                    ? 'bg-neutral-200 text-neutral-900 border border-neutral-300 dark:bg-neutral-800 dark:text-white dark:border-neutral-700'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                Append to Existing
              </button>
              <button
                onClick={() => setImportMode('replace')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-neutral-200 text-neutral-900 border border-neutral-300 dark:bg-neutral-800 dark:text-white dark:border-neutral-700'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                Replace All
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'import' ? (
            <div className="space-y-4">
              {/* Reference Sample Format Box (Requested: "first give them json format to copy and return same type") */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
                <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 text-[11px]">
                    Standard JSON Format (MCQs, Short &amp; Long)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePasteSampleIntoInput}
                      className="px-2 py-0.5 bg-white hover:bg-neutral-200 text-neutral-800 border border-neutral-300 dark:border-transparent dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 rounded text-[10px] transition cursor-pointer"
                    >
                      Fill Example
                    </button>
                    <button
                      onClick={handleCopySample}
                      className="px-2 py-0.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold rounded text-[10px] dark:hover:bg-neutral-200 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSample ? <Check className="w-3 h-3 text-white dark:text-black" /> : <Copy className="w-3 h-3 text-white dark:text-black" />}
                      <span>{copiedSample ? 'Copied' : 'Copy Sample Format'}</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 text-[11px] font-mono text-neutral-800 dark:text-neutral-300 max-h-36 overflow-y-auto bg-neutral-50 dark:bg-black/60 leading-relaxed selection:bg-neutral-300 dark:selection:bg-neutral-700">
                  {SAMPLE_QUESTIONS_JSON}
                </pre>
              </div>

              {/* Paste JSON Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">
                    Paste Your JSON Questions Here
                  </label>
                  {parsedQuestions && (
                    <span className="text-neutral-900 dark:text-white font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{parsedQuestions.length} questions parsed</span>
                    </span>
                  )}
                </div>
                <textarea
                  rows={8}
                  value={jsonInput}
                  onChange={handleInputChange}
                  placeholder={`[\n  {\n    "number": "i.",\n    "type": "mcq",\n    "text": "Your question...",\n    "marks": 1,\n    "options": [\n      { "label": "(a)", "text": "Option A" },\n      { "label": "(b)", "text": "Option B" }\n    ]\n  }\n]`}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 font-mono text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                />
              </div>

              {/* Validation Status */}
              {validationError && (
                <div className="p-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl flex items-start gap-2.5 text-xs text-neutral-800 dark:text-neutral-200">
                  <AlertCircle className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white">Syntax / Format Issue: </span>
                    <span className="text-neutral-600 dark:text-neutral-400">{validationError}</span>
                  </div>
                </div>
              )}

              {/* Parsed Preview Badges */}
              {parsedQuestions && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2 text-xs">
                  <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Questions Preview to Import ({parsedQuestions.length})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {parsedQuestions.map((pq, idx) => (
                      <div
                        key={idx}
                        className="flex items-baseline justify-between gap-2 p-1.5 bg-white dark:bg-black rounded border border-neutral-200 dark:border-neutral-800 text-[11px]"
                      >
                        <div className="truncate flex-1">
                          <span className="font-bold text-neutral-900 dark:text-white mr-1.5">{pq.number}</span>
                          <span className="text-neutral-700 dark:text-neutral-300">{pq.text}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                          <span className="px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 uppercase">
                            {pq.type}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-400">{pq.marks}M</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Export Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Current section questions formatted in the exact JSON schema:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyExport}
                    className="px-3 py-1 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold text-xs rounded-lg dark:hover:bg-neutral-200 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedExport ? <Check className="w-3.5 h-3.5 text-white dark:text-black" /> : <Copy className="w-3.5 h-3.5 text-white dark:text-black" />}
                    <span>{copiedExport ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownloadExportJson}
                    className="px-3 py-1 bg-neutral-100 border border-neutral-300 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white font-medium text-xs rounded-lg dark:hover:bg-neutral-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
                    <span>Download .json</span>
                  </button>
                </div>
              </div>

              <pre className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono text-xs text-neutral-800 dark:text-neutral-200 max-h-96 overflow-y-auto leading-relaxed">
                {exportJsonString}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-300 text-xs rounded-lg dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            Cancel
          </button>

          {activeTab === 'import' && (
            <button
              onClick={handleExecuteImport}
              disabled={!parsedQuestions || parsedQuestions.length === 0}
              className="px-5 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold text-xs rounded-lg dark:hover:bg-neutral-200 disabled:opacity-30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-white dark:text-black" />
              <span>
                {importMode === 'append' ? 'Append' : 'Replace with'}{' '}
                {parsedQuestions ? `${parsedQuestions.length} Questions` : 'Questions'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
