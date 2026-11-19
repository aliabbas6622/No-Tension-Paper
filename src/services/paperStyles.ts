import type React from 'react';
import { AlignmentType } from 'docx';
import {
  ExamPaper,
  ExamSection,
  HeaderElementStyles,
  PaperSettings,
  Question,
  SectionElementStyles,
  TextAlignOption,
  TextElementStyle,
  TextFontKey,
} from '../types/exam';

export interface FontOptionMeta {
  key: TextFontKey;
  label: string;
  shortLabel: string;
  cssFamily: string;
  wordFamily: string;
}

export const FONT_OPTIONS: FontOptionMeta[] = [
  {
    key: 'times',
    label: 'Times New Roman (Board Style)',
    shortLabel: 'Times New Roman',
    cssFamily: '"Times New Roman", Times, "Liberation Serif", "Nimbus Roman", serif',
    wordFamily: 'Times New Roman',
  },
  {
    key: 'classic',
    label: 'Georgia (Classic Serif)',
    shortLabel: 'Georgia',
    cssFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
    wordFamily: 'Georgia',
  },
  {
    key: 'cambria',
    label: 'Cambria (Academic Serif)',
    shortLabel: 'Cambria',
    cssFamily: 'Cambria, "Times New Roman", Georgia, serif',
    wordFamily: 'Cambria',
  },
  {
    key: 'garamond',
    label: 'Garamond (Editorial Serif)',
    shortLabel: 'Garamond',
    cssFamily: '"EB Garamond", Garamond, Georgia, serif',
    wordFamily: 'Garamond',
  },
  {
    key: 'sans',
    label: 'Arial / Clean Sans',
    shortLabel: 'Arial / Sans',
    cssFamily: 'Arial, "Plus Jakarta Sans", Helvetica, sans-serif',
    wordFamily: 'Arial',
  },
  {
    key: 'mono',
    label: 'Courier New (Monospace)',
    shortLabel: 'Courier New',
    cssFamily: '"Courier New", "JetBrains Mono", ui-monospace, monospace',
    wordFamily: 'Courier New',
  },
];

export const INK_COLOR_PRESETS: Array<{ label: string; hex: string }> = [
  { label: 'Pure Black', hex: '#000000' },
  { label: 'Charcoal', hex: '#262626' },
  { label: 'Slate Gray', hex: '#525252' },
  { label: 'Academic Navy', hex: '#1e3a8a' },
  { label: 'Burgundy', hex: '#7f1d1d' },
];

export function getFontMeta(font?: TextFontKey): FontOptionMeta {
  return FONT_OPTIONS.find((f) => f.key === font) || FONT_OPTIONS[0];
}

export function getCssFontFamily(font?: TextFontKey): string {
  return getFontMeta(font).cssFamily;
}

export function getWordFontFamily(font?: TextFontKey): string {
  return getFontMeta(font).wordFamily;
}

export function getBaseSizeDeltaPt(fontSize?: PaperSettings['fontSize']): number {
  if (fontSize === 'sm') return -1;
  if (fontSize === 'lg') return 1.5;
  return 0;
}

export function doesSectionStartOnNewPage(
  section: ExamSection,
  sectionIndex: number,
  settings?: PaperSettings
): boolean {
  if (sectionIndex === 0) return false;
  if (typeof section.startOnNewPage === 'boolean') {
    return section.startOnNewPage;
  }
  return settings?.newPagePerSection === true;
}

export interface ResolvedTextStyle {
  fontFamily: TextFontKey;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  align: TextAlignOption;
  letterSpacing: 'normal' | 'wide' | 'wider';
  color: string;
}

function mergeStyle(
  base: ResolvedTextStyle,
  override?: TextElementStyle
): ResolvedTextStyle {
  if (!override) return base;
  return {
    fontFamily: override.fontFamily ?? base.fontFamily,
    fontSizePt:
      typeof override.fontSizePt === 'number' && !Number.isNaN(override.fontSizePt)
        ? override.fontSizePt
        : base.fontSizePt,
    bold: override.bold ?? base.bold,
    italic: override.italic ?? base.italic,
    underline: override.underline ?? base.underline,
    uppercase: override.uppercase ?? base.uppercase,
    align: override.align ?? base.align,
    letterSpacing: override.letterSpacing ?? base.letterSpacing,
    color: override.color ?? base.color,
  };
}

export function resolveHeaderElementStyle(
  paper: ExamPaper,
  key: keyof HeaderElementStyles
): ResolvedTextStyle {
  const settings = paper.settings;
  const bodyFont: TextFontKey = settings?.fontFamily || 'times';
  const headingFont: TextFontKey = settings?.headingFontFamily || bodyFont;
  const delta = getBaseSizeDeltaPt(settings?.fontSize);

  const defaults: Record<keyof HeaderElementStyles, ResolvedTextStyle> = {
    institutionName: {
      fontFamily: headingFont,
      fontSizePt: 14 + delta,
      bold: true,
      italic: false,
      underline: false,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wide',
      color: '#000000',
    },
    paperCode: {
      fontFamily: 'mono',
      fontSizePt: 9 + delta * 0.5,
      bold: false,
      italic: false,
      underline: false,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wider',
      color: '#404040',
    },
    examinationTitle: {
      fontFamily: headingFont,
      fontSizePt: 13 + delta,
      bold: true,
      italic: false,
      underline: false,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wider',
      color: '#000000',
    },
    examinationMonth: {
      fontFamily: headingFont,
      fontSizePt: 11 + delta,
      bold: false,
      italic: false,
      underline: false,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wide',
      color: '#000000',
    },
    groupName: {
      fontFamily: headingFont,
      fontSizePt: 11 + delta,
      bold: false,
      italic: false,
      underline: false,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wide',
      color: '#000000',
    },
    subjectTitle: {
      fontFamily: headingFont,
      fontSizePt: 12.5 + delta,
      bold: true,
      italic: false,
      underline: false,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wide',
      color: '#000000',
    },
    metadataRow: {
      fontFamily: bodyFont,
      fontSizePt: 10.5 + delta,
      bold: false,
      italic: false,
      underline: false,
      uppercase: false,
      align: 'left',
      letterSpacing: 'normal',
      color: '#000000',
    },
    generalInstructions: {
      fontFamily: bodyFont,
      fontSizePt: 9.5 + delta,
      bold: false,
      italic: true,
      underline: false,
      uppercase: false,
      align: 'left',
      letterSpacing: 'normal',
      color: '#262626',
    },
  };

  return mergeStyle(defaults[key], paper.header.styles?.[key]);
}

export function resolveSectionElementStyle(
  paper: ExamPaper,
  section: ExamSection,
  key: keyof SectionElementStyles
): ResolvedTextStyle {
  const settings = paper.settings;
  const bodyFont: TextFontKey = settings?.fontFamily || 'times';
  const headingFont: TextFontKey = settings?.headingFontFamily || bodyFont;
  const delta = getBaseSizeDeltaPt(settings?.fontSize);

  const defaults: Record<keyof SectionElementStyles, ResolvedTextStyle> = {
    title: {
      fontFamily: headingFont,
      fontSizePt: 12.5 + delta,
      bold: true,
      italic: false,
      underline: true,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wide',
      color: '#000000',
    },
    subtitle: {
      fontFamily: headingFont,
      fontSizePt: 11 + delta,
      bold: true,
      italic: false,
      underline: true,
      uppercase: true,
      align: 'center',
      letterSpacing: 'wide',
      color: '#000000',
    },
    marksBadge: {
      fontFamily: headingFont,
      fontSizePt: 10.5 + delta,
      bold: true,
      italic: false,
      underline: false,
      uppercase: false,
      align: 'center',
      letterSpacing: 'normal',
      color: '#000000',
    },
    instruction: {
      fontFamily: bodyFont,
      fontSizePt: 10.5 + delta,
      bold: true,
      italic: false,
      underline: false,
      uppercase: false,
      align: 'left',
      letterSpacing: 'normal',
      color: '#000000',
    },
    subsectionHeading: {
      fontFamily: headingFont,
      fontSizePt: 11 + delta,
      bold: true,
      italic: false,
      underline: true,
      uppercase: true,
      align: 'left',
      letterSpacing: 'wide',
      color: '#000000',
    },
    questionText: {
      fontFamily: bodyFont,
      fontSizePt: 10.5 + delta,
      bold: false,
      italic: false,
      underline: false,
      uppercase: false,
      align: 'left',
      letterSpacing: 'normal',
      color: '#000000',
    },
  };

  return mergeStyle(defaults[key], section.styles?.[key]);
}

export function resolveQuestionStyle(
  paper: ExamPaper,
  section: ExamSection,
  question: Question
): ResolvedTextStyle {
  const sectionBase = resolveSectionElementStyle(paper, section, 'questionText');
  return mergeStyle(sectionBase, question.style);
}

export function resolveQuestionOptionsStyle(
  paper: ExamPaper,
  section: ExamSection,
  question: Question
): ResolvedTextStyle {
  const settings = paper.settings;
  const bodyFont: TextFontKey = settings?.fontFamily || 'times';
  const delta = getBaseSizeDeltaPt(settings?.fontSize);
  const base: ResolvedTextStyle = {
    fontFamily: section.styles?.questionText?.fontFamily ?? bodyFont,
    fontSizePt: 10 + delta,
    bold: false,
    italic: false,
    underline: false,
    uppercase: false,
    align: 'left',
    letterSpacing: 'normal',
    color: '#000000',
  };
  return mergeStyle(base, question.optionsStyle);
}

export function resolveEndOfPaperStyle(paper: ExamPaper): ResolvedTextStyle {
  const settings = paper.settings;
  const bodyFont: TextFontKey = settings?.fontFamily || 'times';
  const headingFont: TextFontKey = settings?.headingFontFamily || bodyFont;
  const delta = getBaseSizeDeltaPt(settings?.fontSize);
  const base: ResolvedTextStyle = {
    fontFamily: headingFont,
    fontSizePt: 10 + delta,
    bold: true,
    italic: false,
    underline: false,
    uppercase: true,
    align: 'center',
    letterSpacing: 'wider',
    color: '#000000',
  };
  return mergeStyle(base, settings?.endOfPaperStyle);
}

export function resolvedStyleToCss(
  style: ResolvedTextStyle,
  options?: { includeTextAlign?: boolean }
): React.CSSProperties {
  const tracking =
    style.letterSpacing === 'wider'
      ? '0.07em'
      : style.letterSpacing === 'wide'
      ? '0.03em'
      : 'normal';

  return {
    fontFamily: getCssFontFamily(style.fontFamily),
    fontSize: `${style.fontSizePt}pt`,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    textTransform: style.uppercase ? 'uppercase' : 'none',
    letterSpacing: tracking,
    color: style.color,
    ...(options?.includeTextAlign !== false ? { textAlign: style.align } : {}),
  };
}

export function resolvedStyleToInlineCss(
  style: ResolvedTextStyle,
  options?: { includeTextAlign?: boolean }
): string {
  const tracking =
    style.letterSpacing === 'wider'
      ? '0.07em'
      : style.letterSpacing === 'wide'
      ? '0.03em'
      : 'normal';

  const safeFontFamily = getCssFontFamily(style.fontFamily).replace(/"/g, "'");

  const parts = [
    `font-family:${safeFontFamily}`,
    `font-size:${style.fontSizePt}pt`,
    `font-weight:${style.bold ? '700' : '400'}`,
    `font-style:${style.italic ? 'italic' : 'normal'}`,
    `text-decoration:${style.underline ? 'underline' : 'none'}`,
    `text-transform:${style.uppercase ? 'uppercase' : 'none'}`,
    `letter-spacing:${tracking}`,
    `color:${style.color}`,
  ];
  if (options?.includeTextAlign !== false) {
    parts.push(`text-align:${style.align}`);
  }
  return parts.join(';');
}

export function applyTextTransform(text: string, uppercase: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

export function wordColorHex(color: string): string {
  return (color || '#000000').replace(/^#/, '').toUpperCase();
}

export function textAlignToWord(
  align?: TextAlignOption
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}
