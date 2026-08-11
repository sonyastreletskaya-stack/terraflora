import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const input = await FileBlob.load('C:/Users/Admin/Desktop/Работа/БДСибирь.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('Sheet1');
const rows = sheet.getRange('A1:I279').values;
const headers = rows[0];
const plants = rows.slice(1).filter(row => row[0]).map((row, index) => ({
  id: index + 1,
  name: row[0],
  latin: row[1],
  climate: row[2],
  ph: row[3],
  drainage: row[4],
  moisture: row[5],
  light: row[6],
  description: row[7],
  care: row[8],
}));

await fs.writeFile('plants-data.js', `window.TERRAFLORA_PLANTS = ${JSON.stringify(plants, null, 2)};\n`, 'utf8');
console.log(JSON.stringify({ headers, count: plants.length, first: plants[0], last: plants.at(-1) }, null, 2));
