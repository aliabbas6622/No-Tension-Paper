import { ExamPaper } from '../types/exam';

export function getCleanSubjectName(paper: ExamPaper): string {
  return (
    paper.header.subjectTitle?.replace(/^SUBJECT:\s*/i, '').trim() ||
    paper.title ||
    'Exam_Paper'
  );
}

export function getSanitizedBaseFilename(paper: ExamPaper): string {
  return getCleanSubjectName(paper)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'Exam_Paper';
}

export function formatPaperAsPlainText(paper: ExamPaper): string {
  const settings = paper.settings || {
    showGeneralInstructions: true,
    showSectionInstructions: true,
    showEndOfPaper: true,
    showQuestionMarks: true,
    showDividerMarker: true,
  };

  const lines: string[] = [];
  if (paper.header.institutionName) {
    lines.push(paper.header.institutionName.toUpperCase());
  }
  lines.push(paper.header.examinationTitle);
  lines.push(paper.header.examinationMonth);
  lines.push(paper.header.groupName);
  lines.push(paper.header.subjectTitle);
  lines.push(
    `Date: ${paper.header.date || '___'}   |   Duration: ${paper.header.duration || '___'}   |   Max. Marks: ${paper.header.maxMarks || '___'}`
  );
  lines.push('------------------------------------------------------------');

  if (
    settings.showGeneralInstructions !== false &&
    paper.header.generalInstructions &&
    paper.header.generalInstructions.length > 0
  ) {
    lines.push(`Instructions: ${paper.header.generalInstructions.join(' | ')}`);
    lines.push('');
  }

  paper.sections.forEach((section) => {
    lines.push(`${section.name} ${section.subtitle} [${section.marksBadge}]`);
    if (settings.showSectionInstructions !== false && section.instruction) {
      lines.push(section.instruction);
    }
    lines.push('');

    section.questions.forEach((q) => {
      const marksLabel =
        settings.showQuestionMarks !== false && q.marks && q.type !== 'mcq'
          ? ` (${q.marks} Marks)`
          : '';
      lines.push(`${q.number} ${q.text}${marksLabel}`);
      if (q.type === 'mcq' && q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          lines.push(`   ${opt.label} ${opt.text}`);
        });
      }
      lines.push('');
    });
  });

  if (settings.showEndOfPaper !== false) {
    lines.push('------------------------------------------------------------');
    lines.push('*** END OF EXAMINATION PAPER ***');
  }

  return lines.join('\n');
}
