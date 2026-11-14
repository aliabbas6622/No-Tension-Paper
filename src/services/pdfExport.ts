import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ExamPaper } from '../types/exam';
import { getSanitizedBaseFilename } from './paperText';

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOffscreenPrintableNode(paper: ExamPaper): HTMLElement {
  const { header, sections, settings } = paper;
  const isLetter = settings?.paperSize === 'letter';
  const widthPx = isLetter ? 816 : 794; // 8.5in / 210mm at 96dpi
  const fontFamily =
    settings?.fontFamily === 'sans'
      ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : settings?.fontFamily === 'classic'
      ? 'Georgia, Cambria, "Times New Roman", Times, serif'
      : '"Times New Roman", Times, "Liberation Serif", serif';

  const baseFontSize =
    settings?.fontSize === 'sm' ? '12px' : settings?.fontSize === 'lg' ? '15px' : '13.5px';

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${widthPx}px`;
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.color = '#000000';
  wrapper.style.padding = '44px 48px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.fontFamily = fontFamily;
  wrapper.style.fontSize = baseFontSize;
  wrapper.style.lineHeight = '1.5';
  wrapper.style.zIndex = '-1';

  const parts: string[] = [];

  if (header.institutionName) {
    parts.push(
      `<div style="text-align:center;font-weight:700;font-size:17px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;">${escapeHtml(
        header.institutionName
      )}</div>`
    );
  }

  parts.push(`
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-weight:700;font-size:15px;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(
        header.examinationTitle || 'INTERMEDIATE EXAMINATION 2026-27'
      )}</div>
      <div style="font-size:13px;letter-spacing:0.03em;text-transform:uppercase;margin-top:2px;">${escapeHtml(
        header.examinationMonth || 'EXAMINATION MONTH: OCT-25'
      )}</div>
      <div style="font-size:13px;letter-spacing:0.03em;text-transform:uppercase;margin-top:2px;">${escapeHtml(
        header.groupName || 'COMPUTER SCIENCE GROUP'
      )}</div>
      <div style="font-weight:700;font-size:15px;letter-spacing:0.03em;text-transform:uppercase;margin-top:4px;">${escapeHtml(
        header.subjectTitle || 'SUBJECT: COMPUTER PAPER II'
      )}</div>
    </div>
  `);

  parts.push(`
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;padding:8px 0 4px 0;border-bottom:${
      header.showDividerLine !== false ? '1.5px solid #000000' : 'none'
    };">
      <span>Date: ${escapeHtml(header.date || '___')}</span>
      <span>Duration: ${escapeHtml(header.duration || '___')}</span>
      <span>Max. Marks: ${escapeHtml(header.maxMarks || '___')}</span>
    </div>
  `);

  if (
    settings?.showGeneralInstructions !== false &&
    header.generalInstructions &&
    header.generalInstructions.length > 0
  ) {
    parts.push(`
      <div style="margin:10px 0 14px 0;font-size:12px;font-style:italic;border-bottom:1px solid #d4d4d4;padding-bottom:8px;">
        <strong style="font-style:normal;">Instructions: </strong>${escapeHtml(
          header.generalInstructions.join(' | ')
        )}
      </div>
    `);
  }

  sections.forEach((section) => {
    parts.push('<div style="margin-top:22px;">');

    if (settings?.showDividerMarker !== false) {
      parts.push(
        '<div style="text-align:center;font-weight:700;font-size:14px;line-height:1;margin-bottom:6px;">|</div>'
      );
    }

    parts.push(`
      <div style="position:relative;display:flex;align-items:center;justify-content:center;min-height:42px;margin-bottom:8px;">
        <div style="text-align:center;padding:0 110px;">
          <div style="font-size:15px;font-weight:700;text-decoration:underline;text-transform:uppercase;letter-spacing:0.03em;">${escapeHtml(
            section.name
          )}</div>
          <div style="font-size:13px;font-weight:700;text-decoration:underline;text-transform:uppercase;letter-spacing:0.03em;margin-top:2px;">${escapeHtml(
            section.subtitle
          )}</div>
        </div>
        ${
          settings?.showMarksBadges !== false && section.marksBadge
            ? `<div style="position:absolute;right:0;top:50%;transform:translateY(-50%);border:1.5px solid #000000;padding:4px 10px;font-size:12.5px;font-weight:700;white-space:nowrap;">${escapeHtml(
                section.marksBadge
              )}</div>`
            : ''
        }
      </div>
    `);

    if (settings?.showSectionInstructions !== false && section.instruction) {
      parts.push(
        `<div style="font-weight:700;font-size:13px;margin:6px 0 10px 0;">${escapeHtml(
          section.instruction
        )}</div>`
      );
    }

    section.questions.forEach((q) => {
      const showMarks = settings?.showQuestionMarks !== false && q.marks && q.type !== 'mcq';
      parts.push('<div style="margin-bottom:12px;">');
      parts.push(`
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <strong style="margin-right:6px;">${escapeHtml(q.number)}</strong>
            <span>${escapeHtml(q.text)}</span>
          </div>
          ${
            showMarks
              ? `<strong style="white-space:nowrap;flex-shrink:0;">[${escapeHtml(q.marks)} ${
                  q.marks === 1 ? 'Mark' : 'Marks'
                }]</strong>`
              : ''
          }
        </div>
      `);

      if (q.type === 'mcq' && q.options && q.options.length > 0) {
        const cols = q.optionColumns === 4 || settings?.mcqColumns === 4 ? 4 : 2;
        if (q.options.length === 4 && cols === 2) {
          parts.push(`
            <div style="margin-top:6px;padding-left:22px;display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;">
              <div><strong>${escapeHtml(q.options[0].label)}</strong> ${escapeHtml(
            q.options[0].text
          )}</div>
              <div><strong>${escapeHtml(q.options[2].label)}</strong> ${escapeHtml(
            q.options[2].text
          )}</div>
              <div><strong>${escapeHtml(q.options[1].label)}</strong> ${escapeHtml(
            q.options[1].text
          )}</div>
              <div><strong>${escapeHtml(q.options[3].label)}</strong> ${escapeHtml(
            q.options[3].text
          )}</div>
            </div>
          `);
        } else {
          parts.push(
            `<div style="margin-top:6px;padding-left:22px;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:4px 16px;">${q.options
              .map(
                (opt) =>
                  `<div><strong>${escapeHtml(opt.label)}</strong> ${escapeHtml(opt.text)}</div>`
              )
              .join('')}</div>`
          );
        }
      }

      parts.push('</div>');
    });

    parts.push('</div>');
  });

  if (settings?.showEndOfPaper !== false) {
    parts.push(`
      <div style="margin-top:44px;padding-top:14px;border-top:1px solid rgba(0,0,0,0.4);text-align:center;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">*** END OF EXAMINATION PAPER ***</div>
        <div style="font-size:10px;opacity:0.65;margin-top:3px;">Intermediate Examination Board • Official Format</div>
      </div>
    `);
  }

  wrapper.innerHTML = parts.join('');
  return wrapper;
}

/**
 * Generates a crisp PDF blob directly from ExamPaper data using an unzoomed off-screen node.
 * Works reliably from any view (Dashboard, Builder, Mobile Editor, Workspace, Drive, Gmail Scheduler).
 */
export async function generatePaperPDFBlob(
  paper: ExamPaper
): Promise<{ blob: Blob; filename: string }> {
  const offscreen = buildOffscreenPrintableNode(paper);
  document.body.appendChild(offscreen);

  try {
    const canvas = await html2canvas(offscreen, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: offscreen.offsetWidth,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    const isLetter = paper.settings?.paperSize === 'letter';

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isLetter ? 'letter' : 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 1) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const base = getSanitizedBaseFilename(paper);
    const filename = `${base}_Exam_Paper.pdf`;

    return { blob: pdf.output('blob'), filename };
  } finally {
    if (offscreen.parentNode) {
      offscreen.parentNode.removeChild(offscreen);
    }
  }
}

export async function downloadPaperAsPDF(paper: ExamPaper): Promise<void> {
  const { blob, filename } = await generatePaperPDFBlob(paper);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

/**
 * Triggers native system print dialog with dedicated printable styling
 */
export function printPaperDirect(): void {
  try {
    window.print();
  } catch (e) {
    console.error('window.print failed:', e);
  }
}
