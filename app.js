const plants = window.TERRAFLORA_PLANTS || [];
const grid = document.querySelector('#plantGrid');
const summary = document.querySelector('#resultSummary');
const pills = document.querySelector('#activeFilters');
const form = document.querySelector('#filters');
const moreButton = document.querySelector('#showMore');
const dialog = document.querySelector('#plantDialog');
const dialogContent = document.querySelector('#dialogContent');
let visible = 6;
let ranked = [];
let selectedPlant = null;

const fields = ['climate','ph','drainage','moisture','light'];
const fieldLabels = {climate:'Климат',ph:'pH',drainage:'Дренаж',moisture:'Влажность',light:'Свет'};
const normalize = value => String(value || '').toLowerCase().replace('ё','е');
function getFilters(){return Object.fromEntries(fields.map(id=>[id,document.querySelector('#'+id).value]));}
function rankPlants(){
  const selected=getFilters();
  const used=Object.entries(selected).filter(([,v])=>v);
  ranked=plants.map(plant=>{
    let hits=0;
    used.forEach(([key,val])=>{if(normalize(plant[key]).includes(normalize(val)))hits++;});
    return {...plant,score:used.length?Math.round((hits/used.length)*100):92};
  }).filter(p=>!used.length||p.score>0).sort((a,b)=>b.score-a.score||Number(Boolean(b.image))-Number(Boolean(a.image))||a.name.localeCompare(b.name,'ru'));
  pills.innerHTML=used.map(([k,v])=>`<span class="filter-pill">${fieldLabels[k]}: ${v}</span>`).join('');
  summary.textContent=used.length?`Найдено ${ranked.length} · сначала наиболее подходящие`:`${plants.length} растений в базе · показаны рекомендации`;
  render();
}
function tags(plant){return [plant.ph,plant.light,plant.moisture].filter(Boolean).slice(0,3).map(t=>`<span>${t}</span>`).join('');}
function plantVisual(plant,large=false){
  if(!plant.image)return `<div class="plant-visual${large?' dialog-plant-visual':''}" aria-hidden="true"></div>`;
  return `<div class="plant-visual has-image${large?' dialog-plant-visual':''}"><img src="${plant.image}" alt="${escapeHtml(plant.name)}" loading="lazy"></div>`;
}
function render(){
  grid.innerHTML=ranked.slice(0,visible).map((p,i)=>`<article class="plant-card"><span class="plant-number">${String(i+1).padStart(2,'0')}</span><span class="score">${p.score}% подходит</span>${plantVisual(p)}<h3>${p.name}</h3><span class="latin">${p.latin}</span><p class="plant-description">${p.description}</p><div class="plant-tags">${tags(p)}</div><div class="card-actions"><button type="button" data-detail="${p.id}">Подробнее</button><button class="buy" type="button" data-buy="${p.id}">Где купить</button></div></article>`).join('')||'<p>По выбранным условиям совпадений не найдено. Попробуйте изменить один из параметров.</p>';
  moreButton.hidden=visible>=ranked.length;
}
form.addEventListener('submit',e=>{e.preventDefault();visible=6;rankPlants();document.querySelector('.results-section').scrollIntoView({behavior:'smooth'});});
document.querySelector('#resetFilters').addEventListener('click',()=>{form.reset();visible=6;rankPlants();});
moreButton.addEventListener('click',()=>{visible+=6;render();});
grid.addEventListener('click',e=>{
  const id=Number(e.target.dataset.detail||e.target.dataset.buy);if(!id)return;const p=plants.find(x=>x.id===id);
  selectedPlant=p;
  if(e.target.dataset.buy){document.querySelector('#mapPlant').textContent=p.name;document.querySelectorAll('#mapFilters button').forEach(item=>item.classList.toggle('active',item.dataset.category==='all'));renderStores();if(storeMarkers[0])storeMarkers[0].openPopup();document.querySelector('#stores').scrollIntoView({behavior:'smooth'});return;}
  const credit=p.image?`<p class="image-credit">Изображение: ${escapeHtml(p.imageAuthor||'источник')} · ${escapeHtml(p.imageLicense||'Public Domain')} · <a href="${p.imageSource}" target="_blank" rel="noopener">источник ↗</a></p>`:'';
  dialogContent.innerHTML=`<span class="eyebrow">Карточка растения</span><h2 class="dialog-title">${p.name}</h2><i>${p.latin}</i>${plantVisual(p,true)}${credit}<p>${p.description}</p><div class="dialog-grid"><div class="detail-item"><b>Климат</b>${p.climate}</div><div class="detail-item"><b>pH</b>${p.ph}</div><div class="detail-item"><b>Дренаж</b>${p.drainage}</div><div class="detail-item"><b>Влажность</b>${p.moisture}</div><div class="detail-item"><b>Освещение</b>${p.light}</div></div><p class="dialog-care"><b>Сезонный уход</b><br>${p.care}</p>`;dialog.showModal();
});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

const demoStores = [
  {name:'Лемана ПРО',address:'Фабричный переулок, 11',coords:[55.0219842,82.90175],type:'universal',site:'https://novosibirsk.lemanapro.ru/catalogue/semena/'},
  {name:'Лемана ПРО',address:'ул. Ватутина, 107',coords:[54.9642844,82.9362306],type:'universal',site:'https://novosibirsk.lemanapro.ru/catalogue/semena/'},
  {name:'Лемана ПРО',address:'ул. Мясниковой, 35',coords:[55.106484,82.9290441],type:'universal',site:'https://novosibirsk.lemanapro.ru/catalogue/semena/'},
  {name:'Лемана ПРО',address:'Бердское шоссе, 275',coords:[54.8491344,83.0652954],type:'universal',site:'https://novosibirsk.lemanapro.ru/catalogue/semena/'},
  {name:'Сибирские сортовые семена',address:'ул. Никитина, 162, офис 17',coords:[55.0309074,82.9914949],type:'seeds',site:'https://semena-nsk.ru/'},
  {name:'Агро Семенная Компания',address:'ул. Немировича-Данченко, 80',coords:[54.9715556,82.886663],type:'seeds',site:'https://www.intersemena.ru/'},
  {name:'Агро Семенная Компания',address:'ул. Большевистская, 131 к. 2',coords:[55.0003867,82.9580933],type:'seeds',site:'https://www.intersemena.ru/'},
  {name:'Агро Семенная Компания',address:'ул. Зыряновская, 34/1',coords:[55.0091433,82.9398973],type:'seeds',site:'https://www.intersemena.ru/'},
  {name:'Сибирский сад',address:'ул. Челюскинцев, 30/1',coords:[55.0394248,82.90677],type:'universal',site:'https://www.sibsad-nsk.ru/'},
  {name:'Сибирский сад',address:'Центральный рынок, ул. Мичурина, 12 к. 5',coords:[55.042021,82.9236071],type:'universal',site:'https://www.sibsad-nsk.ru/'},
  {name:'Сибирский сад',address:'ул. Станционная, 32 к. 27',coords:[55.0026186,82.8494455],type:'seedlings',site:'https://www.sibsad-nsk.ru/'},
  {name:'Сотка НСК',address:'ул. Комсомольская, 23а/1',coords:[54.9569954,82.9621406],type:'seeds',site:'https://semenasotka.ru/'},
  {name:'Сотка НСК',address:'ул. Комсомольская, 12',coords:[54.9578707,82.9630971],type:'seeds',site:'https://semenasotka.ru/'},
  {name:'Сотка НСК',address:'ул. Зорге, 14',coords:[54.9344985,82.90665],type:'seeds',site:'https://semenasotka.ru/'},
  {name:'Сибирские саженцы',address:'Старое шоссе, 74',coords:[54.924845,83.074911],type:'seedlings',site:'https://sadovii.ru/'},
];
let storeMarkers=[];
let terraMap;
function storePopup(store){
  const plant=document.querySelector('#mapPlant').textContent;
  const stock=plant==='Все растения'?'Семена и посадочный материал':`${plant}: проверить наличие`;
  return `<div class="leaflet-store"><b>${store.name}</b><span>${store.address}</span><strong>${stock}</strong><a href="${store.site}" target="_blank" rel="noopener">Открыть сайт ↗</a><small>Адрес подтверждён, остатки меняются</small></div>`;
}
function renderStores(category='all'){
  storeMarkers.forEach(marker=>marker.remove());
  const visibleStores=demoStores.filter(store=>category==='all'||store.type===category);
  storeMarkers=visibleStores.map(store=>{
    const icon=L.divIcon({className:`terra-marker ${store.type}`,html:'<span></span>',iconSize:[30,38],iconAnchor:[15,35],popupAnchor:[0,-30]});
    return L.marker(store.coords,{icon}).addTo(terraMap).bindPopup(storePopup(store));
  });
  document.querySelector('#storeCount').innerHTML=`<i class="legend-dot"></i>${visibleStores.length} торговых точек`;
}
function initMap(){
  if(!window.L){document.querySelector('#map').innerHTML='<div class="map-error">Карта не загрузилась. Проверьте подключение к интернету.</div>';return;}
  terraMap=L.map('map',{scrollWheelZoom:false}).setView([54.99,82.96],10);
  terraMap.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(terraMap);
  renderStores();
  storeMarkers[0].openPopup();
  window.terraMap=terraMap;
}
initMap();
document.querySelector('#mapFilters').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  document.querySelectorAll('#mapFilters button').forEach(item=>item.classList.remove('active'));button.classList.add('active');
  renderStores(button.dataset.category);if(storeMarkers[0])storeMarkers[0].openPopup();
});

const API_URL='https://functions.yandexcloud.net/d4ehu631k23g6u4p2a3q';
const messages=document.querySelector('#messages');
const chatInput=document.querySelector('#chatInput');
const photoInput=document.querySelector('#photoInput');
const chatHistory=[];
let chatBusy=false;
const escapeHtml=value=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
function appendMessage(role,text,extraClass=''){
  messages.insertAdjacentHTML('beforeend',`<div class="message ${role} ${extraClass}">${escapeHtml(text).replace(/\n/g,'<br>')}</div>`);
  messages.scrollTop=messages.scrollHeight;
}
function assistantContext(){
  const filters=getFilters();
  return {
    plant:selectedPlant?{id:String(selectedPlant.id),name:selectedPlant.name,latin:selectedPlant.latin}:null,
    plot:{region:document.querySelector('#district').value||'Новосибирская область',climate:filters.climate||null,ph:filters.ph||null,drainage:filters.drainage||null,moisture:filters.moisture||null,light:filters.light||null},
    extra:{source:'TerraFlora',databasePlants:plants.length}
  };
}
async function askAssistant(text,imageDataUrl=null){
  const payload={type:imageDataUrl?'photo':'chat',text,context:assistantContext(),history:chatHistory.slice(-12)};
  if(imageDataUrl)payload.imageDataUrl=imageDataUrl;
  const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.answer)throw new Error(data.error||'Не удалось получить ответ');
  return data.answer;
}
function readImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Не удалось прочитать фотографию'));reader.readAsDataURL(file);});}
async function send(text,file=null){
  const cleanText=text.trim()||(file?'Что можно определить по этой фотографии?':'');
  if(!cleanText||chatBusy)return;
  if(file&&file.size>8*1024*1024){appendMessage('bot','Фотография слишком большая. Выберите файл до 8 МБ.','error');return;}
  chatBusy=true;chatInput.disabled=true;
  appendMessage('user',file?`${cleanText}\n📷 Фото прикреплено`:cleanText);
  appendMessage('bot','Изучаю вопрос…','loading');
  try{
    const imageDataUrl=file?await readImage(file):null;
    const answer=await askAssistant(cleanText,imageDataUrl);
    messages.querySelector('.message.loading')?.remove();
    appendMessage('bot',answer);
    chatHistory.push({role:'user',content:cleanText},{role:'assistant',content:answer});
  }catch(error){
    messages.querySelector('.message.loading')?.remove();
    appendMessage('bot',`Не получилось связаться с помощником: ${error.message}. Попробуйте ещё раз.`,'error');
  }finally{chatBusy=false;chatInput.disabled=false;chatInput.placeholder='Спросите о растениях…';chatInput.focus();photoInput.value='';}
}
document.querySelector('#chatForm').addEventListener('submit',event=>{event.preventDefault();const file=photoInput.files[0]||null;const text=chatInput.value;chatInput.value='';send(text,file);});
photoInput.addEventListener('change',()=>{if(photoInput.files[0]){chatInput.placeholder=`Фото: ${photoInput.files[0].name}`;chatInput.focus();}});
document.querySelector('#quickQuestions').addEventListener('click',event=>{if(event.target.tagName==='BUTTON')send(event.target.textContent);});
rankPlants();
