/**
 * CSV 工具函数
 * - 导出时自动添加 UTF-8 BOM，确保 Excel 正确识别中文
 * - 解析时处理引号和换行
 */

/** 安全转义 CSV 字段 */
export function escapeCsv(value: string): string {
  const str = String(value ?? '');
  // 如果包含逗号、换行或双引号，则需要用双引号包裹，并将内部双引号转义为两个双引号
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** 导出 CSV（自动加 UTF-8 BOM） */
export function exportToCsv(filename: string, headers: string[], rows: string[][]): void {
  const bom = '\uFEFF';
  const lines: string[] = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }
  const csvContent = bom + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/** 解析 CSV（简单实现，处理引号和换行） */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const normalized = text.replace(/^\uFEFF/, ''); // 移除 BOM
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // 跳过下一个双引号
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        if (currentRow.length > 0 && currentRow.some(f => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\r') {
        // 忽略单独的 \r，由 \n 处理
      } else {
        currentField += char;
      }
    }
  }

  // 处理最后一行
  currentRow.push(currentField);
  if (currentRow.length > 0 && currentRow.some(f => f.trim().length > 0)) {
    rows.push(currentRow);
  }

  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.length > 1 ? rows.slice(1) : [];
  return { headers, rows: dataRows };
}
