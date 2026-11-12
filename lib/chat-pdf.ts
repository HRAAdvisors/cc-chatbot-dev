import { jsPDF } from 'jspdf';

export function createChatPdf(transcript: string, font: string, title: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('NotoSans-Regular.ttf', font);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');
  doc.setProperties({ title, creator: 'BACE Hub' });
  doc.setFontSize(10);
  const margin = 48;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const lineHeight = 15;
  let y = margin;

  for (const paragraph of transcript.replace(/\r\n?/g, '\n').split('\n')) {
    const lines: string[] = paragraph ? doc.splitTextToSize(paragraph.replace(/\t/g, '    '), width - margin * 2) : [''];
    for (const line of lines) {
      if (y > height - margin - lineHeight) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.text(`${page} / ${pages}`, width - margin, height - 24, { align: 'right' });
  }
  return doc;
}

export async function loadPdfFont() {
  const response = await fetch('/fonts/NotoSans-Regular.ttf');
  if (!response.ok) throw new Error('PDF font unavailable');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}
