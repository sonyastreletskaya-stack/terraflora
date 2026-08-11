import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/Admin/Desktop/Работа/БДСибирь.xlsx';
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: 'workbook,sheet,table,region',
  maxChars: 24000,
  tableMaxRows: 18,
  tableMaxCols: 24,
  tableMaxCellChars: 160,
});
console.log(summary.ndjson);
