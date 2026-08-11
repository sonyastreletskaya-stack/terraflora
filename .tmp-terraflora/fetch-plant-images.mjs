import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'plants-data.js');
const imageDir = path.join(root, 'assets', 'plants');
const creditPath = path.join(root, 'image-credits.json');
const raw = await fs.readFile(dataPath, 'utf8');
const plants = JSON.parse(raw.slice(raw.indexOf('=') + 1).replace(/;\s*$/, '').trim());
await fs.mkdir(imageDir, { recursive: true });

const acceptedLicense = value => /public domain|cc0|cc-zero|pdm|pd[- _]|cc by|cc-by/i.test(value || '');
const cleanHtml = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findImage(plant) {
  const latin = String(plant.latin || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const tokens = latin.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 2);
  if (tokens.length < 2) return null;
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', generator: 'search',
    gsrsearch: `"${latin}" filetype:bitmap`, gsrnamespace: '6', gsrlimit: '40',
    prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '900'
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'TerraFlora/1.0 (plant image research; grooxo.ru)' }
  });
  if (!response.ok) throw new Error(`Commons API ${response.status}`);
  const json = await response.json();
  const pages = Object.values(json.query?.pages || {});
  const candidates = pages.map(page => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata || {};
    const license = cleanHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value);
    const description = cleanHtml(meta.ImageDescription?.value);
    const haystack = `${page.title} ${description}`.toLowerCase();
    const exact = tokens.every(token => haystack.includes(token));
    const bad = /herbarium|specimen|distribution|range map|plate|drawing|illustration|stamp/i.test(haystack);
    return { page, info, meta, license, description, exact, bad };
  }).filter(item => item.info?.thumburl && acceptedLicense(item.license) && item.exact && item.info.width >= 400);
  candidates.sort((a, b) => Number(a.bad) - Number(b.bad) || Number(b.info.mime === 'image/jpeg') - Number(a.info.mime === 'image/jpeg') || b.info.width - a.info.width);
  const best = candidates[0];
  if (!best) return null;
  return {
    url: best.info.thumburl,
    source: best.info.descriptionurl,
    license: best.license,
    author: cleanHtml(best.meta.Artist?.value || best.meta.Credit?.value || 'Не указан'),
    title: best.page.title.replace(/^File:/, ''),
    mime: best.info.thumbmime || best.info.mime,
    description: best.description
  };
}

async function downloadPlant(plant) {
  try {
    const found = await findImage(plant);
    if (!found) return { id: plant.id, name: plant.name, latin: plant.latin, status: 'not_found' };
    const extension = found.mime?.includes('png') ? 'png' : found.mime?.includes('webp') ? 'webp' : 'jpg';
    const fileName = `plant-${String(plant.id).padStart(3, '0')}.${extension}`;
    const response = await fetch(found.url, { headers: { 'User-Agent': 'TerraFlora/1.0 (plant image research; grooxo.ru)' } });
    if (!response.ok) throw new Error(`image ${response.status}`);
    await fs.writeFile(path.join(imageDir, fileName), new Uint8Array(await response.arrayBuffer()));
    plant.image = `assets/plants/${fileName}`;
    plant.imageSource = found.source;
    plant.imageLicense = found.license;
    plant.imageAuthor = found.author;
    return { id: plant.id, name: plant.name, latin: plant.latin, status: 'downloaded', file: plant.image, ...found, url: undefined, mime: undefined };
  } catch (error) {
    return { id: plant.id, name: plant.name, latin: plant.latin, status: 'error', error: error.message };
  }
}

const previous = JSON.parse(await fs.readFile(creditPath, 'utf8'));
const credits = previous.items || [];
const targets = plants.filter(plant => !plant.image);
for (let start = 0; start < targets.length; start += 3) {
  const batch = targets.slice(start, start + 3);
  credits.push(...await Promise.all(batch.map(downloadPlant)));
  if ((start + batch.length) % 15 === 0 || start + batch.length === plants.length) {
    const found = credits.filter(item => item.status === 'downloaded').length;
    console.log(`processed=${start + batch.length}/${targets.length} downloaded=${found}`);
  }
  await delay(250);
}

await fs.writeFile(dataPath, `window.TERRAFLORA_PLANTS = ${JSON.stringify(plants, null, 2)};\n`, 'utf8');
await fs.writeFile(creditPath, JSON.stringify({ ...previous, updatedAt: new Date().toISOString(), acceptedLicenses: ['Public Domain', 'CC0', 'CC BY', 'CC BY-SA'], items: credits }, null, 2), 'utf8');
const summary = {
  total: plants.length,
  downloaded: credits.filter(item => item.status === 'downloaded').length,
  notFound: credits.filter(item => item.status === 'not_found').length,
  errors: credits.filter(item => item.status === 'error').length
};
console.log(JSON.stringify(summary));
