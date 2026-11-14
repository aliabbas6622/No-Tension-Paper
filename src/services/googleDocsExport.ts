import { ExamPaper } from '../types/exam';
import { getAccessToken } from './auth';

export interface GoogleDocExportResult {
  documentId: string;
  url: string;
  title: string;
}

export async function exportPaperToGoogleDocs(
  paper: ExamPaper
): Promise<GoogleDocExportResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google first.');
  }

  const settings = paper.settings || {
    showGeneralInstructions: true,
    showSectionInstructions: true,
    showEndOfPaper: true,
    showQuestionMarks: true,
    showDividerMarker: true,
  };

  const docTitle =
    (paper.header.subjectTitle || '').replace(/^SUBJECT:\s*/i, '').trim() ||
    paper.title ||
    'Examination Paper';

  // 1. Create a new Google Doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${docTitle} - Exam Paper`,
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => null);
    throw new Error(
      errData?.error?.message ||
        `Google Docs API error: ${createRes.status} ${createRes.statusText}`
    );
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // 2. Build plain text representation
  const headerLines: string[] = [];
  if (paper.header.institutionName) {
    headerLines.push(paper.header.institutionName.toUpperCase());
  }
  headerLines.push(paper.header.examinationTitle);
  headerLines.push(paper.header.examinationMonth);
  headerLines.push(paper.header.groupName);
  headerLines.push(paper.header.subjectTitle);

  const metaLine = `Date: ${paper.header.date || '___'}      Duration: ${
    paper.header.duration || '___'
  }      Max. Marks: ${paper.header.maxMarks || '___'}`;
  headerLines.push(metaLine);
  headerLines.push('―'.repeat(70));

  let bodyText = headerLines.join('\n') + '\n\n';

  if (
    settings.showGeneralInstructions !== false &&
    paper.header.generalInstructions &&
    paper.header.generalInstructions.length > 0
  ) {
    bodyText += `Instructions: ${paper.header.generalInstructions.join(' | ')}\n\n`;
  }

  paper.sections.forEach((section) => {
    if (settings.showDividerMarker !== false) {
      bodyText += `|\n`;
    }
    bodyText += `${section.name}\n`;
    bodyText += `${section.subtitle}          [ ${section.marksBadge} ]\n`;
    if (settings.showSectionInstructions !== false && section.instruction) {
      bodyText += `${section.instruction}\n\n`;
    }

    section.questions.forEach((q) => {
      const showMarks =
        settings.showQuestionMarks !== false && q.marks && q.type !== 'mcq';
      bodyText += `${q.number} ${q.text} ${showMarks ? `(${q.marks} Marks)` : ''}\n`;

      if (q.type === 'mcq' && q.options && q.options.length > 0) {
        if (q.options.length === 4) {
          const col1Width = 36;
          const optA = `${q.options[0].label} ${q.options[0].text}`;
          const optC = `${q.options[2].label} ${q.options[2].text}`;
          const optB = `${q.options[1].label} ${q.options[1].text}`;
          const optD = `${q.options[3].label} ${q.options[3].text}`;

          bodyText += `    ${optA.padEnd(col1Width)} ${optC}\n`;
          bodyText += `    ${optB.padEnd(col1Width)} ${optD}\n`;
        } else {
          q.options.forEach((opt) => {
            bodyText += `    ${opt.label} ${opt.text}\n`;
          });
        }
      }
      bodyText += '\n';
    });

    bodyText += '\n';
  });

  if (settings.showEndOfPaper !== false) {
    bodyText += '―'.repeat(70) + '\n';
    bodyText += '                     *** END OF EXAMINATION PAPER ***\n';
  }

  // 3. Insert content into the document
  const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: {
              index: 1,
            },
            text: bodyText,
          },
        },
      ],
    }),
  });

  if (!batchRes.ok) {
    const errData = await batchRes.json().catch(() => null);
    throw new Error(
      errData?.error?.message ||
        `Created Google Doc, but failed to populate content (${batchRes.status}).`
    );
  }

  const url = `https://docs.google.com/document/d/${documentId}/edit`;
  return {
    documentId,
    url,
    title: docTitle,
  };
}
