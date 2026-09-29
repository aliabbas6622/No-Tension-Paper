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
} from 'docx';
import { ExamPaper } from '../types/exam';

export async function exportPaperToWord(paper: ExamPaper): Promise<string> {
  const docChildren: (Paragraph | Table)[] = [];
  const settings = paper.settings || {
    showGeneralInstructions: true,
    showSectionInstructions: true,
    showEndOfPaper: true,
    showQuestionMarks: true,
    showDividerMarker: true,
  };

  // 1. Institution Header (if provided)
  if (paper.header.institutionName) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: paper.header.institutionName.toUpperCase(),
            bold: true,
            size: 26,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // 2. Main Exam Header Lines (Exact format from Image 1)
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: paper.header.examinationTitle || 'INTERMEDIATE EXAMINATION 2026-27',
          bold: true,
          size: 26,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: paper.header.examinationMonth || 'EXAMINATION MONTH: OCT-25',
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: paper.header.groupName || 'COMPUTER SCIENCE GROUP',
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: paper.header.subjectTitle || 'SUBJECT: COMPUTER PAPER II',
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // 3. Metadata Table (Date, Duration, Max Marks)
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: `Date: ${paper.header.date || '___'}`,
                    font: 'Times New Roman',
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Duration: ${paper.header.duration || '___'}`,
                    font: 'Times New Roman',
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Max. Marks: ${paper.header.maxMarks || '___'}`,
                    font: 'Times New Roman',
                    size: 22,
                  }),
                ],
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
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: 'General Instructions: ',
            bold: true,
            font: 'Times New Roman',
            size: 20,
          }),
          new TextRun({
            text: paper.header.generalInstructions.join(' | '),
            italics: true,
            font: 'Times New Roman',
            size: 20,
          }),
        ],
      })
    );
  } else {
    docChildren.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [] }));
  }

  // 5. Sections
  paper.sections.forEach((section) => {
    // Divider marker '|' if enabled
    if (settings.showDividerMarker !== false) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 140, after: 40 },
          children: [
            new TextRun({
              text: '|',
              font: 'Times New Roman',
              size: 24,
            }),
          ],
        })
      );
    }

    // Section Header row with Section title, subtitle and framed marks badge
    const sectionHeaderTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: section.name,
                      bold: true,
                      underline: { type: UnderlineType.SINGLE },
                      font: 'Times New Roman',
                      size: 26,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: section.subtitle,
                      bold: true,
                      underline: { type: UnderlineType.SINGLE },
                      font: 'Times New Roman',
                      size: 24,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({
                      text: section.marksBadge,
                      bold: true,
                      font: 'Times New Roman',
                      size: 24,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    docChildren.push(sectionHeaderTable);

    // Section instruction if enabled
    if (settings.showSectionInstructions !== false && section.instruction) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 120 },
          children: [
            new TextRun({
              text: section.instruction,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );
    }

    // Questions in this section
    section.questions.forEach((q) => {
      const showMarks = settings.showQuestionMarks !== false && q.marks && q.type !== 'mcq';

      docChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({
              text: `${q.number} `,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
            new TextRun({
              text: q.text,
              font: 'Times New Roman',
              size: 22,
            }),
            ...(showMarks
              ? [
                  new TextRun({
                    text: `   [${q.marks} Marks]`,
                    bold: true,
                    font: 'Times New Roman',
                    size: 20,
                  }),
                ]
              : []),
          ],
        })
      );

      // MCQ options 2-column table
      if (q.type === 'mcq' && q.options && q.options.length > 0) {
        if (q.options.length === 4) {
          const optA = `${q.options[0].label} ${q.options[0].text}`;
          const optB = `${q.options[1].label} ${q.options[1].text}`;
          const optC = `${q.options[2].label} ${q.options[2].text}`;
          const optD = `${q.options[3].label} ${q.options[3].text}`;

          const optionsTable = new Table({
            width: { size: 90, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                    },
                    children: [
                      new Paragraph({
                        indent: { left: 360 },
                        children: [new TextRun({ text: optA, font: 'Times New Roman', size: 21 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                    },
                    children: [
                      new Paragraph({
                        indent: { left: 360 },
                        children: [new TextRun({ text: optC, font: 'Times New Roman', size: 21 })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                    },
                    children: [
                      new Paragraph({
                        indent: { left: 360 },
                        children: [new TextRun({ text: optB, font: 'Times New Roman', size: 21 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                    },
                    children: [
                      new Paragraph({
                        indent: { left: 360 },
                        children: [new TextRun({ text: optD, font: 'Times New Roman', size: 21 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          });
          docChildren.push(optionsTable);
        } else {
          q.options.forEach((opt) => {
            docChildren.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({
                    text: `${opt.label} ${opt.text}`,
                    font: 'Times New Roman',
                    size: 21,
                  }),
                ],
              })
            );
          });
        }
      }
    });
  });

  // 6. End of examination sign-off
  if (settings.showEndOfPaper !== false) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: '―'.repeat(40),
            font: 'Times New Roman',
            size: 20,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '*** END OF EXAMINATION PAPER ***',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanName = (paper.header.subjectTitle || 'Exam_Paper')
    .replace(/^SUBJECT:\s*/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const filename = `${cleanName}_Exam_Paper.docx`;

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
