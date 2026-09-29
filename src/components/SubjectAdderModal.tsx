import React, { useState, useId } from 'react';
import {
  ExamPaper,
  SubjectTemplate,
  ExamSection,
  Question,
  MCQOption,
  PaperSettings,
  CurriculumAnswersPayload,
  CurriculumUnitItem,
  CurriculumSubjectRecord,
} from '../types/exam';
import { saveCustomSubject } from '../data/subjectTemplates';
import {
  saveExamPaperToFirestore,
  saveTemplateToFirestore,
  saveCurriculumSubjectToFirestore,
} from '../services/firebase';
import {
  X,
  BookOpen,
  Copy,
  Check,
  Code2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FileText,
  BookmarkCheck,
} from 'lucide-react';

interface SubjectAdderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectAdded: (paper: ExamPaper, template: SubjectTemplate, openWorkspace: boolean) => void;
}

export const EXACT_USER_SAMPLE_JSON = JSON.stringify(
  {
    curriculum_answers: [
      {
        unit: 'Unit 1: Computer Systems',
        pages: ['69', '70'],
        sections: [
          {
            type: 'Encircle the correct answer (MCQs)',
            questions: [
              {
                question_number: 'i',
                question: 'A digital signal has:',
                options: [
                  '(a) Infinite values',
                  '(b) Only two values',
                  '(c) Three values',
                  '(d) Ten values',
                ],
                answer: '(b) Only two values',
              },
            ],
          },
        ],
      },
    ],
  },
  null,
  2
);

export const EXPANDED_CURRICULUM_SAMPLE_JSON = JSON.stringify(
  {
    curriculum_answers: [
      {
        unit: 'Unit 1: Computer Systems',
        pages: ['69', '70'],
        sections: [
          {
            type: 'Encircle the correct answer (MCQs)',
            questions: [
              {
                question_number: 'i',
                question: 'A digital signal has:',
                options: [
                  '(a) Infinite values',
                  '(b) Only two values',
                  '(c) Three values',
                  '(d) Ten values',
                ],
                answer: '(b) Only two values',
              },
              {
                question_number: 'ii',
                question: 'The brain of any computer system is:',
                options: [
                  '(a) Control Unit',
                  '(b) Arithmetic Logic Unit',
                  '(c) Central Processing Unit',
                  '(d) Storage Unit',
                ],
                answer: '(c) Central Processing Unit',
              },
              {
                question_number: 'iii',
                question: 'Which of the following is volatile memory?',
                options: ['(a) ROM', '(b) RAM', '(c) Hard Disk', '(d) Flash Drive'],
                answer: '(b) RAM',
              },
            ],
          },
          {
            type: 'Short Answer Questions',
            questions: [
              {
                question_number: 'i',
                question: 'Differentiate between Analog and Digital signals with practical examples.',
                answer:
                  'Analog signals are continuous waves (e.g., sound), whereas digital signals are discrete pulses representing 0s and 1s.',
              },
              {
                question_number: 'ii',
                question: 'What are the main functions of the Operating System?',
                answer:
                  'Process management, memory allocation, file systems management, and hardware abstraction.',
              },
            ],
          },
          {
            type: 'Detailed Answer Questions',
            questions: [
              {
                question_number: 'i',
                question:
                  'Explain the Von Neumann computer architecture and its primary operational bottlenecks.',
                answer:
                  'Detailed explanation of CPU, shared bus, memory unit, and the Von Neumann bus bottleneck.',
              },
            ],
          },
        ],
      },
    ],
  },
  null,
  2
);

export const SubjectAdderModal: React.FC<SubjectAdderModalProps> = ({
  isOpen,
  onClose,
  onSubjectAdded,
}) => {
  const [classGrade, setClassGrade] = useState('Class 11');
  const [subjectName, setSubjectName] = useState('Computer Science');
  const [groupName, setGroupName] = useState('COMPUTER SCIENCE GROUP');
  const [category, setCategory] = useState<
    'Math' | 'Science' | 'History' | 'Computer Science' | 'English' | 'Other'
  >('Computer Science');
  const [organizationMode, setOrganizationMode] = useState<'board_standard' | 'by_unit'>(
    'board_standard'
  );

  const [jsonText, setJsonText] = useState(EXACT_USER_SAMPLE_JSON);
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parsedPayload, setParsedPayload] = useState<CurriculumAnswersPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick selection helpers
  const classPresets = [
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
    'O Level',
    'A Level',
  ];

  const subjectPresets = [
    { name: 'Computer Science', group: 'COMPUTER SCIENCE GROUP', cat: 'Computer Science' as const },
    { name: 'Physics', group: 'PRE-ENGINEERING & MEDICAL GROUP', cat: 'Science' as const },
    { name: 'Mathematics', group: 'GENERAL SCIENCE & COMMERCE GROUP', cat: 'Math' as const },
    { name: 'Chemistry', group: 'PRE-MEDICAL & ENGINEERING GROUP', cat: 'Science' as const },
    { name: 'Biology', group: 'PRE-MEDICAL GROUP', cat: 'Science' as const },
    { name: 'English Compulsory', group: 'HUMANITIES & SCIENCE GROUP', cat: 'English' as const },
  ];

  const handleSelectPreset = (p: typeof subjectPresets[0]) => {
    setSubjectName(p.name);
    setGroupName(p.group);
    setCategory(p.cat);
  };

  // Pre-validate on load or input change
  const parseAndValidateCurriculumJson = (rawInput: string) => {
    if (!rawInput.trim()) {
      setValidationError('Please paste or load curriculum JSON.');
      setParsedPayload(null);
      return null;
    }

    try {
      // Clean up common pasted annotations like <-- Root Array or // comments
      let sanitized = rawInput
        .replace(/<--[^\n\r]*/g, '') // remove <-- annotations
        .replace(/\/\/[^\n\r]*/g, '') // remove line comments
        .trim();

      const parsed = JSON.parse(sanitized);

      let units: CurriculumUnitItem[] = [];
      if (parsed && Array.isArray(parsed.curriculum_answers)) {
        units = parsed.curriculum_answers;
      } else if (Array.isArray(parsed)) {
        units = parsed;
      } else {
        throw new Error(
          'JSON must contain a root "curriculum_answers" array: { "curriculum_answers": [ ... ] }'
        );
      }

      if (units.length === 0) {
        throw new Error('"curriculum_answers" array is empty. At least 1 unit object is required.');
      }

      // Check structure of units
      let totalQuestions = 0;
      for (let uIdx = 0; uIdx < units.length; uIdx++) {
        const u = units[uIdx];
        if (!u.unit || typeof u.unit !== 'string') {
          throw new Error(`Unit #${uIdx + 1} is missing required string "unit" (e.g. "Unit 1: Computer Systems").`);
        }
        if (!Array.isArray(u.sections) || u.sections.length === 0) {
          throw new Error(`"${u.unit}" is missing "sections" array with at least one section.`);
        }

        for (let sIdx = 0; sIdx < u.sections.length; sIdx++) {
          const s = u.sections[sIdx];
          if (!s.type || typeof s.type !== 'string') {
            throw new Error(`Section #${sIdx + 1} in "${u.unit}" is missing "type" string.`);
          }
          if (!Array.isArray(s.questions) || s.questions.length === 0) {
            throw new Error(`Section "${s.type}" in "${u.unit}" has no questions.`);
          }

          for (let qIdx = 0; qIdx < s.questions.length; qIdx++) {
            const q = s.questions[qIdx];
            if (!q.question && !(q as any).text) {
              throw new Error(`Question #${qIdx + 1} in "${s.type}" is missing "question" text.`);
            }
            totalQuestions++;
          }
        }
      }

      const payload: CurriculumAnswersPayload = { curriculum_answers: units };
      setValidationError(null);
      setParsedPayload(payload);
      return payload;
    } catch (err: any) {
      setValidationError(err.message || 'Invalid JSON syntax');
      setParsedPayload(null);
      return null;
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    parseAndValidateCurriculumJson(val);
  };

  // Convert Curriculum JSON to ExamPaper
  const buildExamPaper = (payload: CurriculumAnswersPayload): ExamPaper => {
    const defaultSettings: PaperSettings = {
      paperSize: 'a4',
      fontFamily: 'times',
      fontSize: 'base',
      showMarksBadges: true,
      mcqColumns: 2,
      showGeneralInstructions: true,
      showSectionInstructions: true,
      showEndOfPaper: true,
      showQuestionMarks: true,
      showDividerMarker: true,
    };

    const paperId = 'paper-' + Date.now();
    const nowIso = new Date().toISOString();

    const sections: ExamSection[] = [];
    let sectionCounter = 0;
    const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    // Helper to parse option strings into MCQOption objects
    const parseOptions = (optionsArr?: any[]): MCQOption[] | undefined => {
      if (!optionsArr || !Array.isArray(optionsArr) || optionsArr.length === 0) return undefined;
      const defaultLabels = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)'];

      return optionsArr.map((opt, idx) => {
        const id = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${idx}`;
        if (typeof opt === 'object' && opt !== null) {
          return {
            id,
            label: opt.label || defaultLabels[idx] || `(${idx + 1})`,
            text: opt.text || String(opt),
          };
        }

        const str = String(opt).trim();
        // Check for leading label like (a) or a. or 1.
        const match = str.match(/^\s*(\([a-zA-Z0-9]+\)|[a-zA-Z0-9]+[\.\)])\s*(.*)$/);
        if (match) {
          let label = match[1];
          if (!label.startsWith('(')) {
            label = `(${label.replace(/[\.\)]/, '')})`;
          }
          return {
            id,
            label,
            text: match[2].trim(),
          };
        }

        return {
          id,
          label: defaultLabels[idx] || `(${idx + 1})`,
          text: str,
        };
      });
    };

    if (organizationMode === 'board_standard') {
      // Group by question style: Section A (MCQs), Section B (Short), Section C (Detailed)
      const mcqQuestions: Question[] = [];
      const shortQuestions: Question[] = [];
      const detailedQuestions: Question[] = [];

      payload.curriculum_answers.forEach((unit, uIdx) => {
        unit.sections.forEach((sec) => {
          const typeLower = sec.type.toLowerCase();
          const isMcq =
            typeLower.includes('mcq') ||
            typeLower.includes('encircle') ||
            typeLower.includes('choice') ||
            sec.questions.some((q) => q.options && q.options.length > 0);

          const isDetailed =
            typeLower.includes('detailed') ||
            typeLower.includes('long') ||
            typeLower.includes('essay');

          sec.questions.forEach((q, qIdx) => {
            const rawText = q.question || (q as any).text || '';
            const opts = parseOptions(q.options);
            const questionId = `q-curr-${Date.now()}-${uIdx}-${qIdx}`;

            if (isMcq || (opts && opts.length > 0)) {
              mcqQuestions.push({
                id: questionId,
                number: q.question_number ? `${q.question_number}.` : `i.`,
                type: 'mcq',
                text: rawText,
                marks: 1,
                options: opts || [
                  { id: '1', label: '(a)', text: 'Option A' },
                  { id: '2', label: '(b)', text: 'Option B' },
                  { id: '3', label: '(c)', text: 'Option C' },
                  { id: '4', label: '(d)', text: 'Option D' },
                ],
                optionColumns: 2,
                answerKey: q.answer,
              });
            } else if (isDetailed) {
              detailedQuestions.push({
                id: questionId,
                number: q.question_number ? `${q.question_number}.` : `i.`,
                type: 'detailed',
                text: rawText,
                marks: 8,
                answerKey: q.answer,
              });
            } else {
              shortQuestions.push({
                id: questionId,
                number: q.question_number ? `${q.question_number}.` : `i.`,
                type: 'short',
                text: rawText,
                marks: 4,
                answerKey: q.answer,
              });
            }
          });
        });
      });

      // Renumber questions smoothly
      const renumberList = (list: Question[]) => {
        const roman = ['i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.', 'xi.', 'xii.', 'xiii.', 'xiv.', 'xv.'];
        list.forEach((q, idx) => {
          if (!q.number || q.number === 'i.') {
            q.number = roman[idx] || `${idx + 1}.`;
          }
        });
      };

      if (mcqQuestions.length > 0) {
        renumberList(mcqQuestions);
        sections.push({
          id: 'sec-a-' + Date.now(),
          name: `SECTION "${sectionLetters[sectionCounter++] || 'A'}"`,
          subtitle: '(MULTIPLE CHOICE QUESTIONS)',
          marksBadge: `${mcqQuestions.length} Marks`,
          instruction: 'Q1 Choose / Encircle the correct answer from the given options:',
          questions: mcqQuestions,
        });
      }

      if (shortQuestions.length > 0) {
        renumberList(shortQuestions);
        const marks = shortQuestions.reduce((a, b) => a + (b.marks || 4), 0);
        sections.push({
          id: 'sec-b-' + Date.now(),
          name: `SECTION "${sectionLetters[sectionCounter++] || 'B'}"`,
          subtitle: '(SHORT ANSWER QUESTIONS)',
          marksBadge: `${marks} Marks`,
          instruction: `Note: Answer all questions with concise and clear explanations.`,
          questions: shortQuestions,
        });
      }

      if (detailedQuestions.length > 0) {
        renumberList(detailedQuestions);
        const marks = detailedQuestions.reduce((a, b) => a + (b.marks || 8), 0);
        sections.push({
          id: 'sec-c-' + Date.now(),
          name: `SECTION "${sectionLetters[sectionCounter++] || 'C'}"`,
          subtitle: '(DETAILED ANSWER QUESTIONS)',
          marksBadge: `${marks} Marks`,
          instruction: `Note: Attempt detailed questions with thorough explanations and diagrams.`,
          questions: detailedQuestions,
        });
      }
    } else {
      // By Unit Organization
      payload.curriculum_answers.forEach((unit, uIdx) => {
        const unitQuestions: Question[] = [];

        unit.sections.forEach((sec) => {
          const typeLower = sec.type.toLowerCase();
          const isMcq =
            typeLower.includes('mcq') ||
            typeLower.includes('encircle') ||
            typeLower.includes('choice') ||
            sec.questions.some((q) => q.options && q.options.length > 0);

          sec.questions.forEach((q, qIdx) => {
            const opts = parseOptions(q.options);
            unitQuestions.push({
              id: `q-unit-${Date.now()}-${uIdx}-${qIdx}`,
              number: q.question_number ? `${q.question_number}.` : `${qIdx + 1}.`,
              type: isMcq || (opts && opts.length > 0) ? 'mcq' : 'short',
              text: q.question || (q as any).text || '',
              marks: isMcq ? 1 : 4,
              options: opts,
              optionColumns: 2,
              answerKey: q.answer,
            });
          });
        });

        const totalUnitMarks = unitQuestions.reduce((a, b) => a + (b.marks || 1), 0);
        const pageInfo = unit.pages && unit.pages.length > 0 ? ` (Pages: ${unit.pages.join(', ')})` : '';

        sections.push({
          id: `sec-unit-${Date.now()}-${uIdx}`,
          name: `SECTION "${sectionLetters[sectionCounter++] || String(uIdx + 1)}"`,
          subtitle: `(${unit.unit.toUpperCase()}${pageInfo})`,
          marksBadge: `${totalUnitMarks} Marks`,
          instruction: `Attempt all questions from ${unit.unit}:`,
          questions: unitQuestions,
        });
      });
    }

    // Calculate total max marks
    const totalMaxMarks = sections.reduce(
      (acc, s) => acc + s.questions.reduce((qa, q) => qa + (q.marks || 1), 0),
      0
    );

    const yearSuffix = new Date().getFullYear();
    const paper: ExamPaper = {
      id: paperId,
      title: `${subjectName} - ${classGrade} Examination`,
      classGrade,
      subjectCategory: category,
      header: {
        examinationTitle: `${classGrade.toUpperCase()} EXAMINATION ${yearSuffix}-${yearSuffix + 1}`,
        examinationMonth: `EXAMINATION MONTH: DEC-${String(yearSuffix).slice(-2)}`,
        groupName: groupName.toUpperCase(),
        subjectTitle: `SUBJECT: ${subjectName.toUpperCase()}`,
        date: new Date().toISOString().split('T')[0],
        duration: totalMaxMarks <= 30 ? '1.5 Hours' : totalMaxMarks <= 60 ? '2 Hours' : '3 Hours',
        maxMarks: totalMaxMarks > 0 ? totalMaxMarks : 50,
        showDividerLine: true,
        generalInstructions: [
          'Read all questions carefully before attempting.',
          'Verify that you have all pages of the examination paper.',
          'Answer in neat, legible handwriting with question numbers indicated.',
        ],
      },
      sections,
      settings: defaultSettings,
      curriculumData: payload,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return paper;
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(EXACT_USER_SAMPLE_JSON);
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 2000);
  };

  const handleLoadExactSample = () => {
    setJsonText(EXACT_USER_SAMPLE_JSON);
    parseAndValidateCurriculumJson(EXACT_USER_SAMPLE_JSON);
  };

  const handleLoadFullSample = () => {
    setJsonText(EXPANDED_CURRICULUM_SAMPLE_JSON);
    parseAndValidateCurriculumJson(EXPANDED_CURRICULUM_SAMPLE_JSON);
  };

  const handleSaveAndAction = async (openWorkspace: boolean) => {
    const payload = parseAndValidateCurriculumJson(jsonText);
    if (!payload) return;

    if (!classGrade.trim()) {
      setValidationError('Please specify Class / Grade (e.g. Class 11).');
      return;
    }
    if (!subjectName.trim()) {
      setValidationError('Please specify Subject Name (e.g. Computer Science).');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedPaper = buildExamPaper(payload);

      // Save as custom template
      const templateName = `${subjectName} (${classGrade})`;
      const template = saveCustomSubject(
        templateName,
        generatedPaper.header.subjectTitle,
        classGrade,
        category,
        generatedPaper,
        payload
      );

      // Save everything to Firebase Firestore database
      try {
        await saveExamPaperToFirestore(generatedPaper);
        await saveTemplateToFirestore(template);

        const curriculumRecord: CurriculumSubjectRecord = {
          id: 'curr-' + Date.now(),
          classGrade,
          subjectName,
          group: groupName,
          category,
          curriculumAnswers: payload.curriculum_answers,
          paperId: generatedPaper.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveCurriculumSubjectToFirestore(curriculumRecord);
      } catch (fbErr) {
        console.warn('Database save notice:', fbErr);
      }

      onSubjectAdded(generatedPaper, template, openWorkspace);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to generate subject paper.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Compute stats
  const unitCount = parsedPayload?.curriculum_answers.length || 0;
  let totalQuestionsCount = 0;
  let totalMcqsCount = 0;
  let totalAnswersCount = 0;

  if (parsedPayload) {
    parsedPayload.curriculum_answers.forEach((u) => {
      u.sections.forEach((s) => {
        s.questions.forEach((q) => {
          totalQuestionsCount++;
          if (q.options && q.options.length > 0) totalMcqsCount++;
          if (q.answer) totalAnswersCount++;
        });
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-black border border-neutral-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-xs">
              <BookOpen className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white tracking-wide uppercase">
                  Subject Adder
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                  Curriculum JSON
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Specify class &amp; subject, then paste curriculum answers JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Step 1: Class and Subject Details */}
          <div className="space-y-4 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-bold">
                  1
                </span>
                Class &amp; Subject Information
              </span>
              <span className="text-[11px] text-neutral-400">Required fields</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class / Grade Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Class / Grade Level <span className="text-white">*</span>
                </label>
                <input
                  type="text"
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  placeholder="e.g. Class 11, Class 9, O Level"
                  className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white transition"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {classPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setClassGrade(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded transition cursor-pointer ${
                        classGrade === preset
                          ? 'bg-white text-black font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Subject Name <span className="text-white">*</span>
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Computer Science, Physics"
                  className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white transition"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {subjectPresets.slice(0, 4).map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded transition cursor-pointer ${
                        subjectName === preset.name
                          ? 'bg-white text-black font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Header Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-neutral-900">
              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400">Examination Group / Stream</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. COMPUTER SCIENCE GROUP"
                  className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400">Exam Layout Organization</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrganizationMode('board_standard')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer text-center ${
                      organizationMode === 'board_standard'
                        ? 'bg-white text-black font-semibold'
                        : 'bg-black text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    Board Standard (A, B, C)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrganizationMode('by_unit')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer text-center ${
                      organizationMode === 'by_unit'
                        ? 'bg-white text-black font-semibold'
                        : 'bg-black text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    Unit-by-Unit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Curriculum JSON Input */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
                Curriculum Answers JSON Format
              </span>

              {/* Sample and helper buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadExactSample}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                  title="Load the 1-question sample from prompt"
                >
                  Prompt Sample
                </button>
                <button
                  type="button"
                  onClick={handleLoadFullSample}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                  title="Load sample with MCQs, short, and long questions"
                >
                  Full Sample
                </button>
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="px-2.5 py-1 bg-white text-black font-semibold rounded-lg text-[11px] hover:bg-neutral-200 transition flex items-center gap-1 cursor-pointer"
                  title="Copy sample curriculum schema"
                >
                  {copiedFormat ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3 text-black" />}
                  <span>{copiedFormat ? 'Copied' : 'Copy Format'}</span>
                </button>
              </div>
            </div>

            {/* Expected Format Collapsible Tip */}
            <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 flex items-center justify-between">
              <span>
                Schema: <code className="text-neutral-200 font-mono">curriculum_answers[]</code> &rarr;{' '}
                <code className="text-neutral-200 font-mono">unit</code>,{' '}
                <code className="text-neutral-200 font-mono">pages[]</code>,{' '}
                <code className="text-neutral-200 font-mono">sections[]</code> &rarr;{' '}
                <code className="text-neutral-200 font-mono">type</code>,{' '}
                <code className="text-neutral-200 font-mono">questions[] (question, options, answer)</code>
              </span>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                rows={11}
                value={jsonText}
                onChange={handleJsonChange}
                placeholder={`{\n  "curriculum_answers": [\n    {\n      "unit": "Unit 1: Computer Systems",\n      "pages": ["69", "70"],\n      "sections": [\n        {\n          "type": "Encircle the correct answer (MCQs)",\n          "questions": [\n            {\n              "question_number": "i",\n              "question": "A digital signal has:",\n              "options": [\n                "(a) Infinite values",\n                "(b) Only two values",\n                "(c) Three values",\n                "(d) Ten values"\n              ],\n              "answer": "(b) Only two values"\n            }\n          ]\n        }\n      ]\n    }\n  ]\n}`}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 font-mono text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-white leading-relaxed selection:bg-neutral-800"
                spellCheck={false}
              />
            </div>

            {/* Live Feedback / Validation Status */}
            {validationError ? (
              <div className="p-3 bg-neutral-950 border border-neutral-700 rounded-xl flex items-start gap-2.5 text-xs text-neutral-200">
                <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Validation Error: </span>
                  <span className="text-neutral-300">{validationError}</span>
                </div>
              </div>
            ) : parsedPayload ? (
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Valid Curriculum JSON</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-300">
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                      {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                      {totalQuestionsCount} Questions
                    </span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                      {totalMcqsCount} MCQs
                    </span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-white font-medium">
                      {totalAnswersCount} Answers
                    </span>
                  </div>
                </div>

                {/* Preview Units and Questions */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1 pr-1 border-t border-neutral-900">
                  {parsedPayload.curriculum_answers.map((unit, uIdx) => (
                    <div key={uIdx} className="space-y-1">
                      <div className="text-[11px] font-semibold text-neutral-200 flex items-center justify-between">
                        <span>{unit.unit}</span>
                        {unit.pages && unit.pages.length > 0 && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Pages: {unit.pages.join(', ')}
                          </span>
                        )}
                      </div>
                      {unit.sections.map((sec, sIdx) => (
                        <div key={sIdx} className="pl-2 border-l border-neutral-800 text-[11px] space-y-1">
                          <div className="text-neutral-400 text-[10px] font-mono uppercase">
                            Section: {sec.type} ({sec.questions.length} Qs)
                          </div>
                          {sec.questions.map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="bg-black/80 rounded p-1.5 border border-neutral-900 flex items-baseline justify-between gap-2"
                            >
                              <div className="truncate flex-1">
                                <span className="font-bold text-white mr-1.5">
                                  {q.question_number || `${qIdx + 1}`}.
                                </span>
                                <span className="text-neutral-300">{q.question}</span>
                              </div>
                              {q.answer && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 shrink-0 font-mono">
                                  Key: {q.answer}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-neutral-900 text-neutral-300 text-xs rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Save to library only */}
            <button
              type="button"
              disabled={isSubmitting || !parsedPayload}
              onClick={() => handleSaveAndAction(false)}
              className="w-full sm:w-auto px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-medium text-xs rounded-lg disabled:opacity-30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-white" />
              <span>Save Subject to Templates</span>
            </button>

            {/* Save & Open Workspace */}
            <button
              type="button"
              disabled={isSubmitting || !parsedPayload}
              onClick={() => handleSaveAndAction(true)}
              className="w-full sm:w-auto px-5 py-2 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 disabled:opacity-30 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Add &amp; Open in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
