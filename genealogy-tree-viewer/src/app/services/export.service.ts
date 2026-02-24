import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExportService {
  public async toPdf(svg: SVGSVGElement, filename = 'genealogy-tree.pdf'): Promise<void> {
    const { jsPDF } = await import('jspdf');
    await import('svg2pdf.js');

    const bbox = svg.getBBox();
    const width = bbox.width + bbox.x + 100;
    const height = bbox.height + bbox.y + 100;
    const pxToMm = 0.264583;

    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [width * pxToMm, height * pxToMm],
    });

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    await (pdf as any).svg(clone, {
      x: 0,
      y: 0,
      width: width * pxToMm,
      height: height * pxToMm,
    });

    pdf.save(filename);
  }

  public toPng(svg: SVGSVGElement, scale = 3, filename = 'genealogy-tree.png'): void {
    const bbox = svg.getBBox();
    const width = (bbox.width + bbox.x + 100) * scale;
    const height = (bbox.height + bbox.y + 100) * scale;

    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  public print(): void {
    window.print();
  }
}
