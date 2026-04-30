import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from './reports.service';
import {
  ReportExportFormat,
  ReportExportScope,
  ReportExportType,
  ReportsExportQueryDto,
} from './dtos/reports-query.dto';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { compileTemplate } from '../../common/utils/compile-template.utils';

type ReportPayload = Record<string, any>;

@Injectable()
export class ReportsExportService {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  async generateExport(hotelId: string, query: ReportsExportQueryDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, currency: true, logo: true },
    });

    const meta = {
      hotelName: hotel?.name ?? 'HotelOS',
      currency: hotel?.currency ?? 'NGN',
      logo: hotel?.logo ?? null,
      from: query.from ?? null,
      to: query.to ?? null,
      scope: query.scope,
      format: query.format,
      report: query.report ?? null,
    };

    const reports = await this.loadReports(hotelId, query);
    const filename = this.buildFilename(query, meta.from, meta.to);

    if (query.format === 'excel') {
      const buffer = await this.buildExcel(meta, reports);
      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${filename}.xlsx`,
        buffer,
      };
    }

    const buffer = await this.buildPdf(meta, reports);
    return {
      contentType: 'application/pdf',
      filename: `${filename}.pdf`,
      buffer,
    };
  }

  private async loadReports(hotelId: string, query: ReportsExportQueryDto) {
    if (query.scope === 'tab' && query.report) {
      return [
        {
          id: query.report,
          title: this.reportTitle(query.report),
          data: await this.loadReport(hotelId, query.report, query),
        },
      ];
    }

    const reports: ReportExportType[] = [
      'overview',
      'revenue',
      'expenses',
      'occupancy',
      'guests',
      'staff',
      'inventory',
    ];

    const data = await Promise.all(
      reports.map(async (report) => ({
        id: report,
        title: this.reportTitle(report),
        data: await this.loadReport(hotelId, report, query),
      })),
    );

    return data;
  }

  private loadReport(
    hotelId: string,
    report: ReportExportType,
    query: ReportsExportQueryDto,
  ) {
    if (report === 'overview') return this.reportsService.getOverview(hotelId, query);
    if (report === 'revenue') return this.reportsService.getRevenue(hotelId, query);
    if (report === 'expenses') return this.reportsService.getCogs(hotelId, query);
    if (report === 'occupancy') return this.reportsService.getOccupancyInsights(hotelId, query);
    if (report === 'guests') return this.reportsService.getGuestInsights(hotelId, query);
    if (report === 'staff') return this.reportsService.getStaffInsights(hotelId, query);
    return this.reportsService.getInventoryInsights(hotelId, query);
  }

  private buildFilename(
    query: { scope: ReportExportScope; format: ReportExportFormat; report?: ReportExportType },
    from?: string | null,
    to?: string | null,
  ) {
    const range = from && to ? `${from}_to_${to}` : 'current-range';
    const scopeLabel = query.scope === 'full' ? 'full-report' : `${query.report ?? 'report'}-report`;
    return `${scopeLabel}-${range}`;
  }

  private reportTitle(report: ReportExportType) {
    if (report === 'overview') return 'Overview';
    if (report === 'revenue') return 'Revenue';
    if (report === 'expenses') return 'Expenses';
    if (report === 'occupancy') return 'Occupancy';
    if (report === 'guests') return 'Guests';
    if (report === 'staff') return 'Staff';
    return 'Inventory';
  }

  private async buildExcel(
    meta: { hotelName: string; currency: string; logo: string | null; from: string | null; to: string | null },
    reports: { id: ReportExportType; title: string; data: ReportPayload }[],
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HotelOS';
    workbook.created = new Date();

    reports.forEach((report) => {
      const sheet = workbook.addWorksheet(report.title.slice(0, 31));
      this.renderWorkbookSheet(sheet, meta, report.title, report.data);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private renderWorkbookSheet(
    sheet: ExcelJS.Worksheet,
    meta: { hotelName: string; currency: string; logo: string | null; from: string | null; to: string | null },
    title: string,
    data: ReportPayload,
  ) {
    const titleRow = sheet.addRow([`${meta.hotelName} - ${title} Report`]);
    titleRow.font = { bold: true, size: 14 };
    sheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);

    const rangeRow = sheet.addRow([`Range: ${meta.from ?? 'default'} to ${meta.to ?? 'default'}`]);
    rangeRow.font = { italic: true, color: { argb: 'FF666666' } };
    sheet.mergeCells(`A${rangeRow.number}:D${rangeRow.number}`);
    sheet.addRow([]);

    if (data.summary) {
      const summaryRow = sheet.addRow(['Summary']);
      summaryRow.font = { bold: true };
      Object.entries(data.summary).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            const row = sheet.addRow([
              `${this.humanize(key)} ${this.humanize(nestedKey)}`,
              this.toCellValue(nestedValue, nestedKey),
            ]);
            this.applyCellFormatting(row.getCell(2), nestedKey, nestedValue, meta.currency);
          });
          return;
        }
        const row = sheet.addRow([this.humanize(key), this.toCellValue(value, key)]);
        this.applyCellFormatting(row.getCell(2), key, value, meta.currency);
      });
      sheet.addRow([]);
    }

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'summary' || key === 'range' || value == null) return;
      if (Array.isArray(value)) {
        if (!value.length) return;
        const sectionRow = sheet.addRow([this.humanize(key)]);
        sectionRow.font = { bold: true };
        this.appendTable(sheet, value, meta.currency);
        sheet.addRow([]);
        return;
      }
      if (typeof value === 'object') {
        const sectionRow = sheet.addRow([this.humanize(key)]);
        sectionRow.font = { bold: true };
        Object.entries(this.sanitizeObject(value)).forEach(([nestedKey, nestedValue]) => {
          const row = sheet.addRow([this.humanize(nestedKey), this.toCellValue(nestedValue, nestedKey)]);
          this.applyCellFormatting(row.getCell(2), nestedKey, nestedValue, meta.currency);
        });
        sheet.addRow([]);
      }
    });

    this.applySheetLayout(sheet);
  }

  private appendTable(sheet: ExcelJS.Worksheet, rows: Record<string, any>[], currency = 'NGN') {
    const sanitizedRows = rows.map((row) => this.sanitizeObject(row));
    const headers = Object.keys(sanitizedRows[0] ?? {});
    if (!headers.length) return;

    const headerRow = sheet.addRow(headers.map((header) => this.humanize(header)));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    const firstTableRow = headerRow.number;

    sanitizedRows.forEach((row) => {
      const dataRow = sheet.addRow(headers.map((header) => this.toCellValue(row[header], header)));
      dataRow.alignment = { vertical: 'top', wrapText: true };
      headers.forEach((header, index) => {
        this.applyCellFormatting(dataRow.getCell(index + 1), header, row[header], currency);
      });
    });

    sheet.views = [
      {
        state: 'frozen',
        ySplit: firstTableRow,
      },
    ];
  }

  private applySheetLayout(sheet: ExcelJS.Worksheet) {
    sheet.properties.defaultRowHeight = 20;

    sheet.columns.forEach((column) => {
      const values = (column.values ?? []).slice(1).map((value) => String(value ?? ''));
      const longest = values.reduce((max, value) => Math.max(max, value.length), 0);
      const hasLongText = values.some((value) => value.length > 40);

      column.width = Math.min(Math.max(longest + 2, 12), hasLongText ? 60 : 36);
      column.alignment = { vertical: 'top', wrapText: hasLongText };
    });

    sheet.eachRow((row) => {
      let maxLines = 1;
      row.eachCell((cell) => {
        const text = String(cell.value ?? '');
        const lineBreaks = text.split('\n').length;
        const estimatedWrapLines = Math.ceil(text.length / 40);
        maxLines = Math.max(maxLines, lineBreaks, estimatedWrapLines);
      });
      row.height = Math.min(Math.max(20, maxLines * 16), 96);
    });
  }

  private sanitizeObject(row: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => !this.isInternalIdKey(key)),
    );
  }

  private isInternalIdKey(key: string) {
    const normalized = key.trim();
    return (
      normalized === 'id' ||
      normalized.endsWith('Id') ||
      normalized.endsWith('_id')
    );
  }

  private async buildPdf(
    meta: { hotelName: string; currency: string; logo: string | null; from: string | null; to: string | null },
    reports: { id: ReportExportType; title: string; data: ReportPayload }[],
  ) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.rect(0, 0, doc.page.width, 108).fill('#0f172a');
    if (meta.logo && meta.logo.startsWith('data:image/')) {
      const logoBuffer = this.dataUrlToBuffer(meta.logo);
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 40, 24, { fit: [58, 58], valign: 'center' });
        } catch {
          // Ignore invalid logo data and continue with text header.
        }
      }
    }

    doc.fillColor('#ffffff');
    doc.font('Helvetica-Bold').fontSize(20).text(`${meta.hotelName} Reports`, 112, 28);
    doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1').text(
      `Range: ${meta.from ?? 'default'} to ${meta.to ?? 'default'}`,
      112,
      56,
    );

    const generatedAt = new Date().toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Generated: ${generatedAt}`, 112, 72);

    const rendered = await compileTemplate('reports/pdf/report-export', {
      hotelName: meta.hotelName,
      currency: meta.currency,
      from: meta.from ?? 'default',
      to: meta.to ?? 'default',
      generatedAt,
      isFullReport: reports.length > 1,
      reports: reports.map((report) => this.buildPdfTemplateReport(report)),
    });

    doc.font('Helvetica').fontSize(10).fillColor('#111827').text(rendered, 40, 132, {
      width: 520,
      lineGap: 3,
    });

    doc.end();
    return done;
  }

  private buildPdfTemplateReport(report: { id: ReportExportType; title: string; data: ReportPayload }) {
    return {
      id: report.id,
      title: report.title,
      summary: this.buildPdfSummary(report.data.summary),
      sections: Object.entries(report.data)
        .filter(([key, value]) => key !== 'summary' && key !== 'range' && value != null)
        .map(([key, value]) => this.buildPdfSection(key, value))
        .filter(Boolean),
    };
  }

  private buildPdfSummary(summary?: Record<string, unknown>) {
    if (!summary) return [];

    return Object.entries(summary).flatMap(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => ({
          label: `${this.humanize(key)} ${this.humanize(nestedKey)}`,
          value: this.toCellValue(nestedValue),
        }));
      }

      return [
        {
          label: this.humanize(key),
          value: this.toCellValue(value),
        },
      ];
    });
  }

  private buildPdfSection(key: string, value: unknown) {
    if (Array.isArray(value)) {
      if (!value.length) return null;
      const previewRows = value
        .map((row) => this.sanitizeObject(row))
        .slice(0, 20)
        .map((row) =>
          Object.entries(row)
            .map(([entryKey, entryValue]) => `${this.humanize(entryKey)}: ${this.toCellValue(entryValue)}`)
            .join(' | '),
        );

      return {
        title: this.humanize(key),
        lines: previewRows,
        truncated: value.length > previewRows.length,
        remainingCount: Math.max(value.length - previewRows.length, 0),
      };
    }

    if (value && typeof value === 'object') {
      return {
        title: this.humanize(key),
        lines: Object.entries(this.sanitizeObject(value as Record<string, unknown>)).map(
          ([entryKey, entryValue]) => `${this.humanize(entryKey)}: ${this.toCellValue(entryValue)}`,
        ),
        truncated: false,
        remainingCount: 0,
      };
    }

    return {
      title: this.humanize(key),
      lines: [String(this.toCellValue(value))],
      truncated: false,
      remainingCount: 0,
    };
  }

  private humanize(value: string) {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private toCellValue(value: unknown, key?: string): string | number | Date {
    if (value == null) return '';
    if (typeof value === 'number') {
      if (key && this.isPercentKey(key)) return value / 100;
      return value;
    }
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (value instanceof Date) return value.toISOString();
    return JSON.stringify(value);
  }

  private applyCellFormatting(
    cell: ExcelJS.Cell,
    key: string,
    rawValue: unknown,
    currency: string,
  ) {
    if (rawValue == null) return;

    if (this.isDateKey(key)) {
      const dateValue = this.normalizeDateValue(rawValue);
      if (dateValue) {
        cell.value = dateValue;
        cell.numFmt = this.isDateTimeKey(key) ? 'dd-mmm-yyyy hh:mm' : 'dd-mmm-yyyy';
        return;
      }
    }

    if (this.isCurrencyKey(key) && typeof rawValue === 'number') {
      cell.numFmt = this.currencyNumberFormat(currency);
      return;
    }

    if (this.isPercentKey(key) && typeof rawValue === 'number') {
      cell.numFmt = '0.0%';
    }
  }

  private isCurrencyKey(key: string) {
    const normalized = key.toLowerCase();
    return (
      normalized.includes('revenue') ||
      normalized.includes('amount') ||
      normalized.includes('cost') ||
      normalized.includes('price') ||
      normalized.includes('balance') ||
      normalized.includes('paid') ||
      normalized.includes('outstanding') ||
      normalized.includes('total') ||
      normalized === 'adr' ||
      normalized === 'revpar'
    );
  }

  private isPercentKey(key: string) {
    const normalized = key.toLowerCase();
    return (
      normalized === 'pct' ||
      normalized.includes('percent') ||
      normalized === 'occupancy' ||
      normalized === 'occupancyrate' ||
      normalized === 'attendancerate' ||
      normalized === 'costratio'
    );
  }

  private isDateKey(key: string) {
    const normalized = key.toLowerCase();
    return (
      normalized.includes('date') ||
      normalized.includes('issuedat') ||
      normalized.includes('createdat') ||
      normalized.includes('paidat') ||
      normalized.includes('checkin') ||
      normalized.includes('checkout')
    );
  }

  private isDateTimeKey(key: string) {
    const normalized = key.toLowerCase();
    return normalized.includes('at') || normalized.includes('datetime');
  }

  private normalizeDateValue(value: unknown) {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  private currencyNumberFormat(currency: string) {
    if (currency === 'NGN') return '"₦"#,##0.00';
    return `"${currency}" #,##0.00`;
  }

  private dataUrlToBuffer(dataUrl: string) {
    const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    if (!match) return null;
    try {
      return Buffer.from(match[1], 'base64');
    } catch {
      return null;
    }
  }
}
