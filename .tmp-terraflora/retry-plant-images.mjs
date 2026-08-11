import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const dataPath=path.join(root,'plants-data.js');
const creditsPath=path.join(root,'image-credits.json');
const imageDir=path.join(root,'assets','plants');
const raw=await fs.readFile(dataPath,'utf8');
const plants=JSON.parse(raw.slice(raw.indexOf('=')+1).replace(/;\s*$/,'').trim());
const report=JSON.parse(await fs.readFile(creditsPath,'utf8'));
const credits=report.items;
const targets=credits.filter(item=>item.status==='error').map(item=>plants.find(plant=>plant.id===item.id)).filter(Boolean);
const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim();
const accepted=value=>/public domain|cc0|cc-zero|pdm|pd[- _]/i.test(value||'');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function safeFetch(url,options={}){
  for(let attempt=0;attempt<5;attempt++){
    const response=await fetch(url,options);
    if(response.status!==429)return response;
    await sleep(5000*(attempt+1));
  }
  throw new Error('rate_limit');
}
async function processPlant(plant){
  try{
    const latin=String(plant.latin||'').replace(/\s*\([^)]*\)\s*/g,' ').trim();
    const tokens=latin.toLowerCase().split(/\s+/).filter(Boolean).slice(0,2);
    const params=new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:`"${latin}" filetype:bitmap`,gsrnamespace:'6',gsrlimit:'12',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'900'});
    const response=await safeFetch(`https://commons.wikimedia.org/w/api.php?${params}`,{headers:{'User-Agent':'TerraFlora/1.0 (plant image research; grooxo.ru)'}});
    if(!response.ok)throw new Error(`Commons API ${response.status}`);
    const json=await response.json();
    const candidates=Object.values(json.query?.pages||{}).map(page=>{
      const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
      const license=clean(meta.LicenseShortName?.value||meta.UsageTerms?.value);
      const description=clean(meta.ImageDescription?.value);
      const haystack=`${page.title} ${description}`.toLowerCase();
      const exact=tokens.length>=2&&tokens.every(token=>haystack.includes(token));
      const bad=/herbarium|specimen|distribution|range map|plate|drawing|illustration|stamp/i.test(haystack);
      return {page,info,meta,license,description,exact,bad};
    }).filter(item=>item.info?.thumburl&&accepted(item.license)&&item.exact&&item.info.width>=400);
    candidates.sort((a,b)=>Number(a.bad)-Number(b.bad)||Number(b.info.mime==='image/jpeg')-Number(a.info.mime==='image/jpeg')||b.info.width-a.info.width);
    const best=candidates[0];
    if(!best)return {id:plant.id,name:plant.name,latin:plant.latin,status:'not_found'};
    const extension=(best.info.thumbmime||best.info.mime)?.includes('png')?'png':(best.info.thumbmime||best.info.mime)?.includes('webp')?'webp':'jpg';
    const fileName=`plant-${String(plant.id).padStart(3,'0')}.${extension}`;
    const imageResponse=await safeFetch(best.info.thumburl,{headers:{'User-Agent':'TerraFlora/1.0 (plant image research; grooxo.ru)'}});
    if(!imageResponse.ok)throw new Error(`image ${imageResponse.status}`);
    await fs.writeFile(path.join(imageDir,fileName),new Uint8Array(await imageResponse.arrayBuffer()));
    const source=best.info.descriptionurl,author=clean(best.meta.Artist?.value||best.meta.Credit?.value||'Не указан');
    plant.image=`assets/plants/${fileName}`;plant.imageSource=source;plant.imageLicense=best.license;plant.imageAuthor=author;
    return {id:plant.id,name:plant.name,latin:plant.latin,status:'downloaded',file:plant.image,source,license:best.license,author,title:best.page.title.replace(/^File:/,''),description:best.description};
  }catch(error){return {id:plant.id,name:plant.name,latin:plant.latin,status:'error',error:error.message};}
}

let completed=0;
for(const plant of targets){
  const result=await processPlant(plant);
  const index=credits.findIndex(item=>item.id===plant.id);
  credits[index]=result;completed++;
  if(completed%10===0||completed===targets.length){
    console.log(`retried=${completed}/${targets.length} total_downloaded=${credits.filter(item=>item.status==='downloaded').length}`);
    await fs.writeFile(dataPath,`window.TERRAFLORA_PLANTS = ${JSON.stringify(plants,null,2)};\n`,'utf8');
    await fs.writeFile(creditsPath,JSON.stringify({...report,updatedAt:new Date().toISOString(),items:credits},null,2),'utf8');
  }
  await sleep(1300);
}
console.log(JSON.stringify({total:plants.length,downloaded:credits.filter(x=>x.status==='downloaded').length,notFound:credits.filter(x=>x.status==='not_found').length,errors:credits.filter(x=>x.status==='error').length}));
