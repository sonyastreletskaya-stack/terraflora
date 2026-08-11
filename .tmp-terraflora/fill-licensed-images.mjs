import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'plants-data.js');
const creditsPath = path.join(root, 'image-credits.json');
const imageDir = path.join(root, 'assets', 'plants');
const raw = await fs.readFile(dataPath, 'utf8');
const plants = JSON.parse(raw.slice(raw.indexOf('=') + 1).replace(/;\s*$/, '').trim());
const report = JSON.parse(await fs.readFile(creditsPath, 'utf8'));
const credits = report.items || [];
const targets = plants.filter(plant => !plant.image);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processPlant(plant) {
  try {
    const latin = String(plant.latin || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const params = new URLSearchParams({
      taxon_name: latin,
      photos: 'true',
      photo_license: 'cc0,cc-by,cc-by-sa',
      quality_grade: 'research',
      per_page: '20',
      order_by: 'votes',
      order: 'desc'
    });
    const response = await fetch(`https://api.inaturalist.org/v1/observations?${params}`, {
      headers: { 'User-Agent': 'TerraFlora/1.0 (licensed plant imagery; grooxo.ru)' }
    });
    if (!response.ok) throw new Error(`iNaturalist API ${response.status}`);
    const json = await response.json();
    const observation = (json.results || []).find(item =>
      item.taxon?.name?.toLowerCase() === latin.toLowerCase() &&
      item.photos?.some(photo => ['cc0', 'cc-by', 'cc-by-sa'].includes(photo.license_code))
    );
    if (!observation) return { id: plant.id, name: plant.name, latin: plant.latin, status: 'not_found' };
    const photo = observation.photos.find(item => ['cc0', 'cc-by', 'cc-by-sa'].includes(item.license_code));
    const imageUrl = photo.url.replace('/square.', '/large.');
    const imageResponse = await fetch(imageUrl, { headers: { 'User-Agent': 'TerraFlora/1.0 (licensed plant imagery; grooxo.ru)' } });
    if (!imageResponse.ok) throw new Error(`image ${imageResponse.status}`);
    const contentType = imageResponse.headers.get('content-type') || '';
    const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `plant-${String(plant.id).padStart(3, '0')}.${extension}`;
    await fs.writeFile(path.join(imageDir, fileName), new Uint8Array(await imageResponse.arrayBuffer()));
    const license = photo.license_code === 'cc0' ? 'CC0' : photo.license_code === 'cc-by-sa' ? 'CC BY-SA' : 'CC BY';
    const author = observation.user?.name || observation.user?.login || 'Участник iNaturalist';
    const source = `https://www.inaturalist.org/observations/${observation.id}`;
    plant.image = `assets/plants/${fileName}`;
    plant.imageSource = source;
    plant.imageLicense = license;
    plant.imageAuthor = author;
    return { id: plant.id, name: plant.name, latin: plant.latin, status: 'downloaded', file: plant.image, source, license, author, title: `iNaturalist observation ${observation.id}` };
  } catch (error) {
    return { id: plant.id, name: plant.name, latin: plant.latin, status: 'error', error: error.message };
  }
}

let completed = 0;
for (const plant of targets) {
  const result = await processPlant(plant);
  const index = credits.findIndex(item => item.id === plant.id);
  if (index >= 0) credits[index] = result; else credits.push(result);
  completed++;
  if (completed % 10 === 0 || completed === targets.length) {
    console.log(`processed=${completed}/${targets.length} total_with_images=${plants.filter(item => item.image).length}`);
    await fs.writeFile(dataPath, `window.TERRAFLORA_PLANTS = ${JSON.stringify(plants, null, 2)};\n`, 'utf8');
    await fs.writeFile(creditsPath, JSON.stringify({ ...report, updatedAt: new Date().toISOString(), acceptedLicenses: ['Public Domain', 'CC0', 'CC BY', 'CC BY-SA'], sources: ['Wikimedia Commons', 'iNaturalist'], items: credits }, null, 2), 'utf8');
  }
  await sleep(350);
}

console.log(JSON.stringify({ total: plants.length, withImages: plants.filter(item => item.image).length, withoutImages: plants.filter(item => !item.image).length }));
