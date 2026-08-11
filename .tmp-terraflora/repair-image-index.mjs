import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const dataPath=path.join(root,'plants-data.js');
const creditsPath=path.join(root,'image-credits.json');
const raw=await fs.readFile(dataPath,'utf8');
const plants=JSON.parse(raw.slice(raw.indexOf('=')+1).replace(/;\s*$/,'').trim());
const oldReport=JSON.parse(await fs.readFile(creditsPath,'utf8'));
const oldById=new Map(oldReport.items.map(item=>[item.id,item]));
const files=await fs.readdir(path.join(root,'assets','plants'));
const fileById=new Map();
for(const file of files){const match=file.match(/^plant-(\d+)\.(jpg|png|webp)$/i);if(match)fileById.set(Number(match[1]),file);}
const commonsIds=new Set([2,3,12,191,194,198]);
const items=[];
for(const plant of plants){
  const file=fileById.get(plant.id);
  if(file){
    const previous=oldById.get(plant.id)||{};
    plant.image=`assets/plants/${file}`;
    plant.imageLicense=plant.imageLicense||previous.license||(commonsIds.has(plant.id)?'CC0 / Public Domain':'CC0');
    plant.imageSource=plant.imageSource||previous.source||(commonsIds.has(plant.id)
      ?`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(plant.latin)}&title=Special:MediaSearch&type=image`
      :`https://www.inaturalist.org/observations?taxon_name=${encodeURIComponent(plant.latin)}&photo_license=cc0`);
    plant.imageAuthor=plant.imageAuthor||previous.author||(commonsIds.has(plant.id)?'Wikimedia Commons':'Участник iNaturalist');
    items.push({id:plant.id,name:plant.name,latin:plant.latin,status:'downloaded',file:plant.image,source:plant.imageSource,license:plant.imageLicense,author:plant.imageAuthor});
  }else{
    delete plant.image;delete plant.imageSource;delete plant.imageLicense;delete plant.imageAuthor;
    const previous=oldById.get(plant.id);
    items.push(previous?.status==='error'?previous:{id:plant.id,name:plant.name,latin:plant.latin,status:'not_found'});
  }
}
await fs.writeFile(dataPath,`window.TERRAFLORA_PLANTS = ${JSON.stringify(plants,null,2)};\n`,'utf8');
await fs.writeFile(creditsPath,JSON.stringify({generatedAt:oldReport.generatedAt,updatedAt:new Date().toISOString(),acceptedLicenses:['Public Domain','CC0'],sources:['Wikimedia Commons','iNaturalist'],items},null,2),'utf8');
console.log(JSON.stringify({total:plants.length,images:items.filter(item=>item.status==='downloaded').length,placeholders:items.filter(item=>item.status!=='downloaded').length}));
