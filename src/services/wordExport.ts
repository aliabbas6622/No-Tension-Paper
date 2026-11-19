import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
  UnderlineType,
  TableLayoutType,
  VerticalAlign,
} from 'docx';
import { ExamPaper, MCQOption } from '../types/exam';
import {
  applyTextTransform,
  doesSectionStartOnNewPage,
  getWordFontFamily,
  ResolvedTextStyle,
  resolveEndOfPaperStyle,
  resolveHeaderElementStyle,
  resolveQuestionOptionsStyle,
  resolveQuestionStyle,
  resolveSectionElementStyle,
  textAlignToWord,
  wordColorHex,
} from './paperStyles';

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

const NO_TABLE_BORDERS = {
  ...NO_BORDERS,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

function toHalfPoints(pt: number): number {
  return Math.max(14, Math.round(pt * 2));
}

function makeStyledRun(
  text: string,
  style: ResolvedTextStyle,
  overrides?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    sizeHalfPt?: number;
    color?: string;
  }
): TextRun {
  const underlineOn = overrides?.underline ?? style.underline;
  return new TextRun({
    text: applyTextTransform(text, style.uppercase),
    font: getWordFontFamily(style.fontFamily),
    size: overrides?.sizeHalfPt ?? toHalfPoints(style.fontSizePt),
    bold: overrides?.bold ?? style.bold,
    italics: overrides?.italic ?? style.italic,
    underline: underlineOn ? { type: UnderlineType.SINGLE } : undefined,
    color: overrides?.color ?? wordColorHex(style.color),
  });
}

export async function buildPaperWordBlob(
  paper: ExamPaper
): Promise<{ blob: Blob; filename: string }> {
  const docChildren: (Paragraph | Table)[] = [];
  const settings = paper.settings || {
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

  const defaultWordFont = getWordFontFamily(settings.fontFamily);

  const isLetter = settings.paperSize === 'letter';
  const pageWidth = isLetter ? 12240 : 11906;
  const pageHeight = isLetter ? 15840 : 16838;
  const marginTopBottom = 720; // 0.5 in
  const marginLeftRight = 794; // ~14mm (matches print/PDF layout)
  const contentWidth = pageWidth - marginLeftRight * 2;

  const instStyle = resolveHeaderElementStyle(paper, 'institutionName');
  const codeStyle = resolveHeaderElementStyle(paper, 'paperCode');
  const examTitleStyle = resolveHeaderElementStyle(paper, 'examinationTitle');
  const examMonthStyle = resolveHeaderElementStyle(paper, 'examinationMonth');
  const groupStyle = resolveHeaderElementStyle(paper, 'groupName');
  const subjectStyle = resolveHeaderElementStyle(paper, 'subjectTitle');
  const metaStyle = resolveHeaderElementStyle(paper, 'metadataRow');
  const genInstStyle = resolveHeaderElementStyle(paper, 'generalInstructions');
  const endStyle = resolveEndOfPaperStyle(paper);

  // 1. Optional Institution & Paper Code
  if (paper.header.institutionName) {
    docChildren.push(
      new Paragraph({
        alignment: textAlignToWord(instStyle.align),
        spacing: { before: 0, after: 50 },
        children: [makeStyledRun(paper.header.institutionName, instStyle)],
      })
    );
  }

  if (paper.header.paperCode) {
    docChildren.push(
      new Paragraph({
        alignment: textAlignToWord(codeStyle.align),
        spacing: { before: 0, after: 80 },
        children: [makeStyledRun(`Paper Code: ${paper.header.paperCode}`, codeStyle)],
      })
    );
  }

  // 2. Main Exam Header Lines
  docChildren.push(
    new Paragraph({
      alignment: textAlignToWord(examTitleStyle.align),
      spacing: { before: 0, after: 50 },
      children: [
        makeStyledRun(
          paper.header.examinationTitle || 'INTERMEDIATE EXAMINATION 2026-27',
          examTitleStyle
        ),
      ],
    }),
    new Paragraph({
      alignment: textAlignToWord(examMonthStyle.align),
      spacing: { before: 0, after: 45 },
      children: [
        makeStyledRun(
          paper.header.examinationMonth || 'EXAMINATION MONTH: OCT-25',
          examMonthStyle
        ),
      ],
    }),
    new Paragraph({
      alignment: textAlignToWord(groupStyle.align),
      spacing: { before: 0, after: 55 },
      children: [
        makeStyledRun(paper.header.groupName || 'COMPUTER SCIENCE GROUP', groupStyle),
      ],
    }),
    new Paragraph({
      alignment: textAlignToWord(subjectStyle.align),
      spacing: { before: 20, after: 140 },
      children: [
        makeStyledRun(paper.header.subjectTitle || 'SUBJECT: COMPUTER PAPER II', subjectStyle),
      ],
    })
  );

  // 3. Metadata Table (Date, Duration, Max Marks)
  const showDivider = paper.header.showDividerLine !== false;
  const metaBottomBorder = showDivider
    ? { style: BorderStyle.SINGLE, size: 10, color: '000000' }
    : NO_BORDER;

  const metaCol1 = Math.floor(contentWidth * 0.34);
  const metaCol2 = Math.floor(contentWidth * 0.32);
  const metaCol3 = contentWidth - metaCol1 - metaCol2;

  const metaTable = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [metaCol1, metaCol2, metaCol3],
    layout: TableLayoutType.FIXED,
    margins: { top: 60, bottom: 70, left: 0, right: 0 },
    borders: {
      top: NO_BORDER,
      bottom: metaBottomBorder,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: metaCol1, type: WidthType.DXA },
            borders: { ...NO_BORDERS, bottom: metaBottomBorder },
            margins: { top: 40, bottom: 60, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0 },
                children: [makeStyledRun(`Date: ${paper.header.date || '___'}`, metaStyle)],
              }),
            ],
          }),
          new TableCell({
            width: { size: metaCol2, type: WidthType.DXA },
            borders: { ...NO_BORDERS, bottom: metaBottomBorder },
            margins: { top: 40, bottom: 60, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [makeStyledRun(`Duration: ${paper.header.duration || '___'}`, metaStyle)],
              }),
            ],
          }),
          new TableCell({
            width: { size: metaCol3, type: WidthType.DXA },
            borders: { ...NO_BORDERS, bottom: metaBottomBorder },
            margins: { top: 40, bottom: 60, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0 },
                children: [makeStyledRun(`Max. Marks: ${paper.header.maxMarks || '___'}`, metaStyle)],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(metaTable);

  // 4. General Instructions (if enabled)
  if (
    settings.showGeneralInstructions !== false &&
    paper.header.generalInstructions &&
    paper.header.generalInstructions.length > 0
  ) {
    docChildren.push(
      new Paragraph({
        alignment: textAlignToWord(genInstStyle.align),
        spacing: { before: 120, after: 140, line: 260 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: 'D4D4D4',
            space: 6,
          },
        },
        children: [
          makeStyledRun('Instructions: ', genInstStyle, { bold: true, italic: false }),
          makeStyledRun(paper.header.generalInstructions.join(' | '), genInstStyle),
        ],
      })
    );
  }

  // 5. Sections
  paper.sections.forEach((section, secIdx) => {
    const startsNewPage = doesSectionStartOnNewPage(section, secIdx, settings);
    const titleStyle = resolveSectionElementStyle(paper, section, 'title');
    const subtitleStyle = resolveSectionElementStyle(paper, section, 'subtitle');
    const badgeStyle = resolveSectionElementStyle(paper, section, 'marksBadge');
    const secInstStyle = resolveSectionElementStyle(paper, section, 'instruction');

    // Divider marker '|' or explicit page-break paragraph
    if (settings.showDividerMarker !== false) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          pageBreakBefore: startsNewPage,
          spacing: { before: startsNewPage ? 0 : secIdx === 0 ? 140 : 240, after: 60 },
          children: [
            new TextRun({
              text: '|',
              bold: true,
              font: defaultWordFont,
              size: toHalfPoints(11),
              color: '333333',
            }),
          ],
        })
      );
    } else if (startsNewPage) {
      docChildren.push(
        new Paragraph({
          pageBreakBefore: true,
          spacing: { before: 0, after: 0 },
          children: [],
        })
      );
    } else if (secIdx > 0) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 180, after: 0 },
          children: [],
        })
      );
    } else {
      docChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 0 },
          children: [],
        })
      );
    }

    // Section Header: Balanced 3-column layout so title is centered and marks box hugs its text
    const showBadge =
      settings.showMarksBadges !== false &&
      Boolean(section.marksBadge && section.marksBadge.trim());

    if (showBadge) {
      const badgeText = section.marksBadge.trim();
      const badgeWidth = Math.max(
        1300,
        Math.min(2600, badgeText.length * Math.round(badgeStyle.fontSizePt * 12) + 420)
      );
      const centerWidth = contentWidth - badgeWidth * 2;
      const boxBorder = {
        style: BorderStyle.SINGLE,
        size: 8,
        color: '000000',
      };

      const sectionTitleChildren: Paragraph[] = [
        new Paragraph({
          alignment: textAlignToWord(titleStyle.align),
          spacing: { before: 0, after: section.subtitle ? 35 : 0 },
          children: [makeStyledRun(section.name, titleStyle)],
        }),
      ];

      if (section.subtitle) {
        sectionTitleChildren.push(
          new Paragraph({
            alignment: textAlignToWord(subtitleStyle.align),
            spacing: { before: 0, after: 0 },
            children: [makeStyledRun(section.subtitle, subtitleStyle)],
          })
        );
      }

      const sectionHeaderTable = new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: [badgeWidth, centerWidth, badgeWidth],
        layout: TableLayoutType.FIXED,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: NO_TABLE_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: badgeWidth, type: WidthType.DXA },
                borders: NO_BORDERS,
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0 },
                    children: [new TextRun({ text: '', size: 2 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: centerWidth, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                borders: NO_BORDERS,
                margins: { top: 20, bottom: 20, left: 60, right: 60 },
                children: sectionTitleChildren,
              }),
              new TableCell({
                width: { size: badgeWidth, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                  top: boxBorder,
                  bottom: boxBorder,
                  left: boxBorder,
                  right: boxBorder,
                },
                margins: { top: 75, bottom: 75, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: textAlignToWord(badgeStyle.align),
                    spacing: { before: 0, after: 0 },
                    children: [makeStyledRun(badgeText, badgeStyle)],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      docChildren.push(sectionHeaderTable);
    } else {
      docChildren.push(
        new Paragraph({
          alignment: textAlignToWord(titleStyle.align),
          spacing: { before: 0, after: section.subtitle ? 35 : 40 },
          children: [makeStyledRun(section.name, titleStyle)],
        })
      );
      if (section.subtitle) {
        docChildren.push(
          new Paragraph({
            alignment: textAlignToWord(subtitleStyle.align),
            spacing: { before: 0, after: 40 },
            children: [makeStyledRun(section.subtitle, subtitleStyle)],
          })
        );
      }
    }

    // Section instruction if enabled
    if (settings.showSectionInstructions !== false && section.instruction) {
      docChildren.push(
        new Paragraph({
          alignment: textAlignToWord(secInstStyle.align),
          spacing: { before: 120, after: 140, line: 276 },
          children: [makeStyledRun(section.instruction, secInstStyle)],
        })
      );
    }

    // Questions in this section
    let prevSub = '';
    const subHeadingStyle = resolveSectionElementStyle(paper, section, 'subsectionHeading');

    section.questions.forEach((q, qIdx) => {
      const currSub = (q.subsection || '').trim();
      if (currSub && currSub !== prevSub) {
        docChildren.push(
          new Paragraph({
            alignment: textAlignToWord(subHeadingStyle.align),
            keepNext: true,
            spacing: {
              before: qIdx === 0 ? 60 : 180,
              after: q.subsectionInstruction ? 40 : 80,
            },
            children: [makeStyledRun(currSub, subHeadingStyle)],
          })
        );
        if (q.subsectionInstruction) {
          docChildren.push(
            new Paragraph({
              alignment: textAlignToWord(secInstStyle.align),
              keepNext: true,
              spacing: { before: 0, after: 80, line: 260 },
              children: [makeStyledRun(q.subsectionInstruction, secInstStyle)],
            })
          );
        }
        prevSub = currSub;
      }

      const qStyle = resolveQuestionStyle(paper, section, q);
      const optStyle = resolveQuestionOptionsStyle(paper, section, q);
      const showMarks =
        settings.showQuestionMarks !== false &&
        Boolean(q.marks) &&
        q.type !== 'mcq';
      const hasOptions =
        q.type === 'mcq' && Boolean(q.options && q.options.length > 0);
      const isLastQuestion = qIdx === section.questions.length - 1;

      if (showMarks) {
        const marksColWidth = 1450;
        const textColWidth = contentWidth - marksColWidth;
        const marksLabel = `[${q.marks} ${q.marks === 1 ? 'Mark' : 'Marks'}]`;

        const questionRowTable = new Table({
          width: { size: contentWidth, type: WidthType.DXA },
          columnWidths: [textColWidth, marksColWidth],
          layout: TableLayoutType.FIXED,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          borders: NO_TABLE_BORDERS,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: textColWidth, type: WidthType.DXA },
                  borders: NO_BORDERS,
                  margins: {
                    top: qIdx === 0 ? 40 : 120,
                    bottom: hasOptions ? 40 : isLastQuestion ? 40 : 90,
                    left: 0,
                    right: 120,
                  },
                  children: [
                    new Paragraph({
                      alignment: textAlignToWord(qStyle.align),
                      spacing: { before: 0, after: 0, line: 276 },
                      children: [
                        makeStyledRun(`${q.number} `, qStyle, { bold: true }),
                        makeStyledRun(q.text, qStyle),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: marksColWidth, type: WidthType.DXA },
                  borders: NO_BORDERS,
                  margins: {
                    top: qIdx === 0 ? 40 : 120,
                    bottom: hasOptions ? 40 : isLastQuestion ? 40 : 90,
                    left: 0,
                    right: 0,
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: 0, after: 0, line: 276 },
                      children: [
                        makeStyledRun(marksLabel, qStyle, {
                          bold: true,
                          sizeHalfPt: toHalfPoints(Math.max(8, qStyle.fontSizePt - 0.5)),
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        });

        docChildren.push(questionRowTable);
      } else {
        docChildren.push(
          new Paragraph({
            alignment: textAlignToWord(qStyle.align),
            spacing: {
              before: qIdx === 0 ? 40 : 140,
              after: hasOptions ? 60 : isLastQuestion ? 60 : 110,
              line: 276,
            },
            children: [
              makeStyledRun(`${q.number} `, qStyle, { bold: true }),
              makeStyledRun(q.text, qStyle),
            ],
          })
        );
      }

      // MCQ options display (supports 1, 2, or 4 columns)
      if (hasOptions && q.options) {
        const cols = q.optionColumns ?? settings.mcqColumns ?? 2;
        const leftIndent = 440;
        const optTableWidth = contentWidth - leftIndent;

        const makeOptionCell = (
          opt: MCQOption | undefined,
          colWidth: number,
          isLastRow: boolean
        ) =>
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            borders: NO_BORDERS,
            margins: {
              top: 25,
              bottom: isLastRow ? 65 : 35,
              left: 0,
              right: 120,
            },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: 260 },
                children: opt
                  ? [
                      makeStyledRun(`${opt.label} `, optStyle),
                      makeStyledRun(opt.text, optStyle),
                    ]
                  : [],
              }),
            ],
          });

        if (cols === 1) {
          q.options.forEach((opt, optIdx) => {
            const isLastOpt = optIdx === q.options!.length - 1;
            docChildren.push(
              new Paragraph({
                indent: { left: leftIndent },
                spacing: { before: 20, after: isLastOpt ? 80 : 35, line: 260 },
                children: [makeStyledRun(`${opt.label} ${opt.text}`, optStyle)],
              })
            );
          });
        } else if (cols === 4) {
          const colW = Math.floor(optTableWidth / 4);
          const colWidths = [colW, colW, colW, optTableWidth - colW * 3];
          const rows: TableRow[] = [];
          for (let i = 0; i < q.options.length; i += 4) {
            const isLastRow = i + 4 >= q.options.length;
            rows.push(
              new TableRow({
                children: [0, 1, 2, 3].map((offset) =>
                  makeOptionCell(q.options![i + offset], colWidths[offset], isLastRow)
                ),
              })
            );
          }
          docChildren.push(
            new Table({
              width: { size: optTableWidth, type: WidthType.DXA },
              indent: { size: leftIndent, type: WidthType.DXA },
              columnWidths: colWidths,
              layout: TableLayoutType.FIXED,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              borders: NO_TABLE_BORDERS,
              rows,
            })
          );
        } else {
          const col1W = Math.floor(optTableWidth / 2);
          const col2W = optTableWidth - col1W;
          const rows: TableRow[] =
            q.options.length === 4
              ? [
                  new TableRow({
                    children: [
                      makeOptionCell(q.options[0], col1W, false),
                      makeOptionCell(q.options[2], col2W, false),
                    ],
                  }),
                  new TableRow({
                    children: [
                      makeOptionCell(q.options[1], col1W, true),
                      makeOptionCell(q.options[3], col2W, true),
                    ],
                  }),
                ]
              : Array.from(
                  { length: Math.ceil(q.options.length / 2) },
                  (_, rowIdx) => {
                    const i = rowIdx * 2;
                    const isLastRow = i + 2 >= q.options!.length;
                    return new TableRow({
                      children: [
                        makeOptionCell(q.options![i], col1W, isLastRow),
                        makeOptionCell(q.options![i + 1], col2W, isLastRow),
                      ],
                    });
                  }
                );

          docChildren.push(
            new Table({
              width: { size: optTableWidth, type: WidthType.DXA },
              indent: { size: leftIndent, type: WidthType.DXA },
              columnWidths: [col1W, col2W],
              layout: TableLayoutType.FIXED,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              borders: NO_TABLE_BORDERS,
              rows,
            })
          );
        }
      }
    });
  });

  // 6. End of examination sign-off
  if (settings.showEndOfPaper !== false) {
    docChildren.push(
      new Paragraph({
        alignment: textAlignToWord(endStyle.align),
        spacing: { before: 380, after: 40 },
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: '999999',
            space: 10,
          },
        },
        children: [makeStyledRun('*** END OF EXAMINATION PAPER ***', endStyle)],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: 'Intermediate Examination Board • Official Format',
            font: defaultWordFont,
            size: toHalfPoints(8.5),
            color: '666666',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: defaultWordFont,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: pageWidth, height: pageHeight },
            margin: {
              top: marginTopBottom,
              right: marginLeftRight,
              bottom: marginTopBottom,
              left: marginLeftRight,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanName = (paper.header.subjectTitle || paper.title || 'Exam_Paper')
    .replace(/^SUBJECT:\s*/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const filename = `${cleanName}_Exam_Paper.docx`;

  return { blob, filename };
}

export async function exportPaperToWord(paper: ExamPaper): Promise<string> {
  const { blob, filename } = await buildPaperWordBlob(paper);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Critical: Delay revoking so browsers in iframes complete the download
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 20000);

  return filename;
}
