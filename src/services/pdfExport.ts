import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ExamPaper } from '../types/exam';

/**
 * Generates and downloads a clean A4 PDF file directly in the browser.
 * Uses html2canvas-pro to support modern CSS color spaces including oklch().
 */
export async function downloadPaperAsPDF(
  paper: ExamPaper,
  elementId = 'printable-exam-paper'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Exam paper preview element not found. Please ensure the preview is visible.');
  }

  // Render high-res canvas with full support for oklch, lab, and modern CSS
  const canvas = await html2canvas(element, {
    scale: 2, // 2x resolution for sharp, professional print-grade text
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Calculate scaled height to fit A4 width
  const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Multi-page splitting if paper is long
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  const cleanName = (paper.header.subjectTitle || 'Exam_Paper')
    .replace(/^SUBJECT:\s*/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const filename = `${cleanName}_Exam_Paper.pdf`;

  pdf.save(filename);
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
