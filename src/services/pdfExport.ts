import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ExamPaper, ExamSection, Question } from '../types/exam';
import { getSanitizedBaseFilename } from './paperText';
import {
  doesSectionStartOnNewPage,
  getCssFontFamily,
  resolvedStyleToInlineCss,
  resolveEndOfPaperStyle,
  resolveHeaderElementStyle,
  resolveQuestionOptionsStyle,
  resolveQuestionStyle,
  resolveSectionElementStyle,
} from './paperStyles';

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHeaderHtml(paper: ExamPaper): string {
  const { header, settings } = paper;
  const instStyle = resolveHeaderElementStyle(paper, 'institutionName');
  const codeStyle = resolveHeaderElementStyle(paper, 'paperCode');
  const examTitleStyle = resolveHeaderElementStyle(paper, 'examinationTitle');
  const examMonthStyle = resolveHeaderElementStyle(paper, 'examinationMonth');
  const groupStyle = resolveHeaderElementStyle(paper, 'groupName');
  const subjectStyle = resolveHeaderElementStyle(paper, 'subjectTitle');
  const metaStyle = resolveHeaderElementStyle(paper, 'metadataRow');
  const genInstStyle = resolveHeaderElementStyle(paper, 'generalInstructions');

  const parts: string[] = [];

  if (header.institutionName) {
    parts.push(
      `<div style="${resolvedStyleToInlineCss(instStyle)};margin-bottom:4px;">${escapeHtml(
        header.institutionName
      )}</div>`
    );
  }

  if (header.paperCode) {
    parts.push(
      `<div style="${resolvedStyleToInlineCss(codeStyle)};margin-bottom:4px;">Paper Code: ${escapeHtml(
        header.paperCode
      )}</div>`
    );
  }

  parts.push(`
    <div style="margin-bottom:14px;">
      <div style="${resolvedStyleToInlineCss(examTitleStyle)};">${escapeHtml(
        header.examinationTitle || 'INTERMEDIATE EXAMINATION 2026-27'
      )}</div>
      <div style="${resolvedStyleToInlineCss(examMonthStyle)};margin-top:2px;">${escapeHtml(
        header.examinationMonth || 'EXAMINATION MONTH: OCT-25'
      )}</div>
      <div style="${resolvedStyleToInlineCss(groupStyle)};margin-top:2px;">${escapeHtml(
        header.groupName || 'COMPUTER SCIENCE GROUP'
      )}</div>
      <div style="${resolvedStyleToInlineCss(subjectStyle)};margin-top:4px;">${escapeHtml(
        header.subjectTitle || 'SUBJECT: COMPUTER PAPER II'
      )}</div>
    </div>
  `);

  parts.push(`
    <div style="${resolvedStyleToInlineCss(metaStyle, {
      includeTextAlign: false,
    })};display:flex;justify-content:space-between;align-items:center;padding:8px 0 4px 0;border-bottom:${
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
      <div style="${resolvedStyleToInlineCss(
        genInstStyle
      )};margin:10px 0 14px 0;border-bottom:1px solid #d4d4d4;padding-bottom:8px;">
        <strong style="font-style:normal;">Instructions: </strong>${escapeHtml(
          header.generalInstructions.join(' | ')
        )}
      </div>
    `);
  }

  return `<div style="padding-bottom:8px;">${parts.join('')}</div>`;
}

function renderSectionHeaderHtml(
  paper: ExamPaper,
  section: ExamSection,
  isTopOfPage: boolean
): string {
  const { settings } = paper;
  const titleStyle = resolveSectionElementStyle(paper, section, 'title');
  const subtitleStyle = resolveSectionElementStyle(paper, section, 'subtitle');
  const badgeStyle = resolveSectionElementStyle(paper, section, 'marksBadge');
  const secInstStyle = resolveSectionElementStyle(paper, section, 'instruction');

  const parts: string[] = [];
  parts.push(`<div style="padding-top:${isTopOfPage ? '0' : '14px'};">`);

  if (settings?.showDividerMarker !== false) {
    parts.push(
      '<div style="text-align:center;font-weight:700;font-size:14px;line-height:1;margin-bottom:6px;">|</div>'
    );
  }

  parts.push(`
    <div style="position:relative;display:flex;align-items:center;justify-content:center;min-height:42px;margin-bottom:8px;">
      <div style="width:100%;box-sizing:border-box;text-align:center;padding:0 110px;">
        <div style="${resolvedStyleToInlineCss(titleStyle)};">${escapeHtml(
          section.name
        )}</div>
        ${
          section.subtitle
            ? `<div style="${resolvedStyleToInlineCss(subtitleStyle)};margin-top:2px;">${escapeHtml(
                section.subtitle
              )}</div>`
            : ''
        }
      </div>
      ${
        settings?.showMarksBadges !== false && section.marksBadge
          ? `<div style="${resolvedStyleToInlineCss(
              badgeStyle
            )};position:absolute;right:0;top:50%;transform:translateY(-50%);border:1.5px solid #000000;padding:4px 10px;white-space:nowrap;">${escapeHtml(
              section.marksBadge
            )}</div>`
          : ''
      }
    </div>
  `);

  if (settings?.showSectionInstructions !== false && section.instruction) {
    parts.push(
      `<div style="${resolvedStyleToInlineCss(secInstStyle)};margin:6px 0 10px 0;">${escapeHtml(
        section.instruction
      )}</div>`
    );
  }

  parts.push('</div>');
  return parts.join('');
}

function renderSubsectionHeaderHtml(
  paper: ExamPaper,
  section: ExamSection,
  subsectionTitle: string,
  subsectionInstruction: string | undefined,
  isFirstInSection: boolean
): string {
  const subStyle = resolveSectionElementStyle(paper, section, 'subsectionHeading');
  const instStyle = resolveSectionElementStyle(paper, section, 'instruction');
  const topPad = isFirstInSection ? '2px' : '10px';
  return `
    <div style="padding:${topPad} 0 6px 0;">
      <div style="${resolvedStyleToInlineCss(subStyle)};">${escapeHtml(subsectionTitle)}</div>
      ${
        subsectionInstruction
          ? `<div style="${resolvedStyleToInlineCss(instStyle)};margin-top:2px;">${escapeHtml(
              subsectionInstruction
            )}</div>`
          : ''
      }
    </div>
  `;
}

function renderQuestionHtml(
  paper: ExamPaper,
  section: ExamSection,
  q: Question
): string {
  const { settings } = paper;
  const qStyle = resolveQuestionStyle(paper, section, q);
  const optStyle = resolveQuestionOptionsStyle(paper, section, q);
  const showMarks = settings?.showQuestionMarks !== false && q.marks && q.type !== 'mcq';

  const parts: string[] = ['<div style="padding-bottom:12px;">'];
  parts.push(`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;line-height:1.55;">
      <div style="${resolvedStyleToInlineCss(qStyle)};flex:1;">
        <strong style="margin-right:6px;">${escapeHtml(q.number)}</strong>
        <span>${escapeHtml(q.text)}</span>
      </div>
      ${
        showMarks
          ? `<strong style="${resolvedStyleToInlineCss(qStyle, {
              includeTextAlign: false,
            })};font-weight:700;white-space:nowrap;flex-shrink:0;">[${escapeHtml(q.marks)} ${
              q.marks === 1 ? 'Mark' : 'Marks'
            }]</strong>`
          : ''
      }
    </div>
  `);

  if (q.type === 'mcq' && q.options && q.options.length > 0) {
    const cols = q.optionColumns ?? settings?.mcqColumns ?? 2;
    const optCss = resolvedStyleToInlineCss(optStyle, { includeTextAlign: false });
    if (q.options.length === 4 && cols === 2) {
      parts.push(`
        <div style="${optCss};margin-top:6px;padding-left:22px;display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;line-height:1.45;">
          <div><span style="font-weight:500;">${escapeHtml(q.options[0].label)}</span> ${escapeHtml(
        q.options[0].text
      )}</div>
          <div><span style="font-weight:500;">${escapeHtml(q.options[2].label)}</span> ${escapeHtml(
        q.options[2].text
      )}</div>
          <div><span style="font-weight:500;">${escapeHtml(q.options[1].label)}</span> ${escapeHtml(
        q.options[1].text
      )}</div>
          <div><span style="font-weight:500;">${escapeHtml(q.options[3].label)}</span> ${escapeHtml(
        q.options[3].text
      )}</div>
        </div>
      `);
    } else {
      parts.push(
        `<div style="${optCss};margin-top:6px;padding-left:22px;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:4px 16px;line-height:1.45;">${q.options
          .map(
            (opt) =>
              `<div><span style="font-weight:500;">${escapeHtml(opt.label)}</span> ${escapeHtml(
                opt.text
              )}</div>`
          )
          .join('')}</div>`
      );
    }
  }

  parts.push('</div>');
  return parts.join('');
}

function renderFooterHtml(paper: ExamPaper): string {
  const endStyle = resolveEndOfPaperStyle(paper);
  return `
    <div style="margin-top:28px;padding-top:14px;border-top:1px solid rgba(0,0,0,0.4);text-align:center;">
      <div style="${resolvedStyleToInlineCss(endStyle)};">*** END OF EXAMINATION PAPER ***</div>
      <div style="font-size:10px;opacity:0.65;margin-top:3px;">Intermediate Examination Board • Official Format</div>
    </div>
  `;
}

interface PdfBlockSpec {
  html: string;
  forceNewPageBefore?: boolean;
  keepWithNext?: boolean;
}

function createOffscreenPageShell(
  paper: ExamPaper,
  widthPx: number,
  fixedHeightPx?: number
): HTMLElement {
  const { settings } = paper;
  const fontFamily = getCssFontFamily(settings?.fontFamily).replace(/"/g, "'");
  const baseFontSize =
    settings?.fontSize === 'sm' ? '12px' : settings?.fontSize === 'lg' ? '15px' : '13.5px';

  const page = document.createElement('div');
  page.style.position = 'fixed';
  page.style.left = '-10000px';
  page.style.top = '0';
  page.style.width = `${widthPx}px`;
  if (fixedHeightPx) {
    page.style.height = `${fixedHeightPx}px`;
    page.style.overflow = 'hidden';
  }
  page.style.backgroundColor = '#ffffff';
  page.style.color = '#000000';
  page.style.padding = '44px 48px';
  page.style.boxSizing = 'border-box';
  page.style.fontFamily = fontFamily;
  page.style.fontSize = baseFontSize;
  page.style.lineHeight = '1.5';
  page.style.zIndex = '-1';
  return page;
}

/**
 * Generates a crisp multi-page PDF blob from ExamPaper data:
 * - Prevents splitting questions across page boundaries
 * - Keeps section headers paired with their first question
 * - Respects per-section page breaks (New Page Per Section)
 * - Honors all per-heading & per-element font/size/style/color overrides
 */
export async function generatePaperPDFBlob(
  paper: ExamPaper
): Promise<{ blob: Blob; filename: string }> {
  const isLetter = paper.settings?.paperSize === 'letter';
  const widthPx = isLetter ? 816 : 794; // 8.5in / 210mm at 96dpi
  const pageHeightPx = isLetter
    ? Math.floor((widthPx * 11) / 8.5)
    : Math.floor((widthPx * 297) / 210);
  const verticalPaddingPx = 88; // 44px top + 44px bottom
  const maxContentHeightPx = pageHeightPx - verticalPaddingPx;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isLetter ? 'letter' : 'a4',
  });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Build ordered blocks
  const blocks: PdfBlockSpec[] = [{ html: renderHeaderHtml(paper) }];

  paper.sections.forEach((section, secIdx) => {
    const startsNewPage = doesSectionStartOnNewPage(section, secIdx, paper.settings);
    const hasQuestions = section.questions.length > 0;
    blocks.push({
      html: renderSectionHeaderHtml(paper, section, startsNewPage),
      forceNewPageBefore: startsNewPage,
      keepWithNext: hasQuestions,
    });
    let prevSub = '';
    section.questions.forEach((q, qIdx) => {
      const currSub = (q.subsection || '').trim();
      if (currSub && currSub !== prevSub) {
        blocks.push({
          html: renderSubsectionHeaderHtml(
            paper,
            section,
            currSub,
            q.subsectionInstruction,
            qIdx === 0
          ),
          keepWithNext: true,
        });
        prevSub = currSub;
      }
      blocks.push({
        html: renderQuestionHtml(paper, section, q),
      });
    });
  });

  if (paper.settings?.showEndOfPaper !== false) {
    blocks.push({ html: renderFooterHtml(paper) });
  }

  // Measure each block's exact rendered height in an offscreen measurement shell
  const measureShell = createOffscreenPageShell(paper, widthPx);
  document.body.appendChild(measureShell);

  const blockHeights: number[] = [];
  try {
    measureShell.innerHTML = blocks
      .map((b, i) => `<div data-block-idx="${i}">${b.html}</div>`)
      .join('');
    const nodes = measureShell.querySelectorAll<HTMLElement>('[data-block-idx]');
    nodes.forEach((el) => {
      blockHeights.push(el.getBoundingClientRect().height);
    });
  } finally {
    if (measureShell.parentNode) {
      measureShell.parentNode.removeChild(measureShell);
    }
  }

  // Paginate blocks cleanly so no question is cut mid-line across pages
  const pages: string[][] = [];
  let currentPageHtml: string[] = [];
  let currentHeight = 0;

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const h = blockHeights[i] ?? 0;
    let neededWithNext = h;
    let lookahead = i;
    while (blocks[lookahead]?.keepWithNext && lookahead + 1 < blocks.length) {
      lookahead += 1;
      neededWithNext += blockHeights[lookahead] ?? 0;
    }

    if (block.forceNewPageBefore && currentPageHtml.length > 0) {
      pages.push(currentPageHtml);
      currentPageHtml = [];
      currentHeight = 0;
    } else if (
      currentPageHtml.length > 0 &&
      currentHeight + neededWithNext > maxContentHeightPx
    ) {
      pages.push(currentPageHtml);
      currentPageHtml = [];
      currentHeight = 0;
    }

    currentPageHtml.push(block.html);
    currentHeight += h;
  }

  if (currentPageHtml.length > 0) {
    pages.push(currentPageHtml);
  }

  // Render each exact page canvas into the PDF
  for (let pIdx = 0; pIdx < pages.length; pIdx += 1) {
    const pageNode = createOffscreenPageShell(paper, widthPx, pageHeightPx);
    pageNode.innerHTML = pages[pIdx].join('');
    document.body.appendChild(pageNode);

    try {
      const canvas = await html2canvas(pageNode, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: widthPx,
        height: pageHeightPx,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      if (pIdx > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    } finally {
      if (pageNode.parentNode) {
        pageNode.parentNode.removeChild(pageNode);
      }
    }
  }

  const base = getSanitizedBaseFilename(paper);
  const filename = `${base}_Exam_Paper.pdf`;

  return { blob: pdf.output('blob'), filename };
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
