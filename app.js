const attendees = [
  { code:'WD-MINJUN', name:'Minjun Kim', initials:'MK', role:'AI Research Intern', org:'KAIST Vision Lab', interests:['multimodal AI','RAG','computer vision','retrieval','agents'], goals:['research collaborators','open-source builders'], projects:['Visual retrieval reliability','Multimodal document QA'], links:['LinkedIn','GitHub','Scholar'] },
  { code:'WD-SORA', name:'Sora Park', initials:'SP', role:'Product Engineer', org:'Seoul AI Collective', interests:['agents','AI products','evaluation','developer tools','RAG'], goals:['startup builders','open-source builders'], projects:['Agent evaluation toolkit','AI workflow studio'], links:['LinkedIn','GitHub'] },
  { code:'WD-DANIEL', name:'Daniel Chen', initials:'DC', role:'PhD Candidate', org:'NUS Computing', interests:['computer vision','uncertainty','calibration','multimodal AI'], goals:['research collaborators','student researchers'], projects:['Reliable vision systems','Uncertainty under distribution shift'], links:['Scholar','LinkedIn'] },
  { code:'WD-MAYA', name:'Maya Singh', initials:'MS', role:'Founder', org:'ProtoLab', interests:['AI products','education','agents','community'], goals:['startup builders','designers','student founders'], projects:['AI-native learning communities'], links:['LinkedIn','Website'] },
  { code:'WD-JIHO', name:'Jiho Lee', initials:'JL', role:'ML Engineer', org:'Open Model Guild', interests:['open source','LLMs','RAG','inference','evaluation'], goals:['open-source builders','research collaborators'], projects:['Efficient RAG stack','Model evaluation harness'], links:['GitHub','LinkedIn'] },
  { code:'WD-AISHA', name:'Aisha Rahman', initials:'AR', role:'Research Assistant', org:'Human-AI Lab', interests:['HCI','AI safety','multimodal AI','education'], goals:['research collaborators','student researchers'], projects:['Human-AI collaboration studies'], links:['Scholar','LinkedIn'] }
];

const $ = id => document.getElementById(id);
let stream = null;
let scanTimer = null;
let faceMatchBusy = false;

const defaultMe = {name:'Arjun', role:'AI / CS student & builder', interests:['RAG','multimodal AI','computer vision','agents','research'], goals:['research collaborators','mentors','startup builders']};
function me(){
  const stored = JSON.parse(localStorage.getItem('whodis-me') || 'null');
  return stored || defaultMe;
}
function normalize(xs){return xs.map(x=>x.trim().toLowerCase()).filter(Boolean)}
function overlap(a,b){const B=new Set(normalize(b)); return normalize(a).filter(x=>B.has(x))}
function scoreFor(person){
  const m=me(); const oi=overlap(m.interests,person.interests); const og=overlap(m.goals,person.goals);
  const base=42+oi.length*11+og.length*8; return {score:Math.min(97,base),oi,og};
}
function opener(person,oi){
  const focus=oi[0] || person.interests[0];
  const project=person.projects[0];
  return `“I saw you're working around ${focus}. I’m exploring a related direction — especially how it connects to ${project.toLowerCase()}. What part has been hardest to make reliable?”`;
}
function collab(person,oi){
  if(oi.includes('rag')||oi.includes('retrieval')) return 'Compare retrieval failure cases and test whether your approaches complement each other.';
  if(oi.includes('computer vision')||oi.includes('multimodal ai')) return 'Explore a small multimodal benchmark or reliability experiment together.';
  if(oi.includes('agents')) return 'Prototype an agent workflow and split product vs. evaluation responsibilities.';
  return `Trade notes on ${oi[0]||person.interests[0]} and look for one concrete 1-week experiment.`;
}
function renderResult(person, faceMeta=null){
  const m=scoreFor(person);
  const faceLine = faceMeta ? `<div class="match-chip">face match · distance ${faceMeta.distance} / threshold ${faceMeta.threshold}</div>` : '';
  $('workspace').classList.remove('hidden');
  $('resultPanel').innerHTML=`
    <div class="result-top">
      <div class="avatar">${person.initials}</div>
      <div><h2>${person.name}</h2><p>${person.role} · ${person.org}</p>${faceLine}</div>
      <div class="score"><b>${m.score}%</b><small>useful overlap</small></div>
    </div>
    <div class="brief">
      <div class="brief-card"><label>SHARED CONTEXT</label><div class="tags">${(m.oi.length?m.oi:['adjacent AI interests']).map(x=>`<span class="tag">${x}</span>`).join('')}</div></div>
      <div class="brief-card"><label>THEY'RE LOOKING FOR</label><div class="tags">${person.goals.map(x=>`<span class="tag">${x}</span>`).join('')}</div></div>
      <div class="brief-card wide"><label>WHY YOU SHOULD TALK</label><p>${collab(person,m.oi)}</p></div>
      <div class="brief-card wide"><label>BEST OPENER</label><p>${opener(person,m.oi)}</p></div>
      <div class="brief-card"><label>THEIR PROJECTS</label><p>${person.projects.join(' · ')}</p></div>
      <div class="brief-card"><label>OPTED-IN LINKS</label><p>${person.links.join(' · ')}</p></div>
    </div>`;
  $('workspace').scrollIntoView({behavior:'smooth'});
}
function renderDirectory(){
  $('directoryGrid').innerHTML = attendees.map(p=>`<div class="person-card" data-code="${p.code}"><div class="avatar">${p.initials}</div><h4>${p.name}</h4><p>${p.role}<br>${p.org}</p><div class="tags">${p.interests.slice(0,3).map(x=>`<span class="tag">${x}</span>`).join('')}</div></div>`).join('');
  document.querySelectorAll('.person-card').forEach(card=>card.addEventListener('click',()=>{const p=attendees.find(x=>x.code===card.dataset.code);$('directory').classList.add('hidden');renderResult(p)}));
}
function findCode(code){
  const p=attendees.find(x=>x.code===code.trim().toUpperCase());
  if(p) renderResult(p);
  else $('scanStatus').textContent='Badge not found';
}
function apiBase(){return $('faceApi').value.trim().replace(/\/$/,'')}
function eventId(){return $('eventId').value.trim() || 'demo-event'}
function saveScannerConfig(){
  localStorage.setItem('whodis-scan-config',JSON.stringify({faceApi:$('faceApi').value.trim(),eventId:eventId()}));
}
function loadScannerConfig(){
  const cfg=JSON.parse(localStorage.getItem('whodis-scan-config')||'null');
  if(cfg?.faceApi)$('faceApi').value=cfg.faceApi;
  if(cfg?.eventId)$('eventId').value=cfg.eventId;
}
async function captureFrameBlob(){
  const video=$('video');
  if(!stream || !video.videoWidth || !video.videoHeight) throw new Error('Camera is not ready');
  const canvas=$('captureCanvas');
  const maxW=960;
  const scale=Math.min(1,maxW/video.videoWidth);
  canvas.width=Math.round(video.videoWidth*scale);
  canvas.height=Math.round(video.videoHeight*scale);
  const ctx=canvas.getContext('2d');
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not capture frame')),'image/jpeg',0.9));
}
async function matchFace(){
  if(faceMatchBusy || !stream) return;
  faceMatchBusy=true;
  $('faceMatch').disabled=true;
  $('scanStatus').textContent='Matching against opted-in attendees…';
  saveScannerConfig();
  try{
    const blob=await captureFrameBlob();
    const form=new FormData();
    form.append('photo',blob,'capture.jpg');
    const response=await fetch(`${apiBase()}/events/${encodeURIComponent(eventId())}/match`,{method:'POST',body:form});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.detail || `Face API error ${response.status}`);
    if(!data.matched){
      $('scanStatus').textContent='No confident match in this event';
      return;
    }
    const person=attendees.find(x=>x.code===String(data.attendee_id).toUpperCase());
    if(!person){
      $('scanStatus').textContent=`Matched ${data.display_name || data.attendee_id}, but no local profile card exists yet`;
      return;
    }
    $('scanStatus').textContent='matched. ohhh, whodis.';
    renderResult(person,{distance:data.distance,threshold:data.threshold});
  }catch(err){
    $('scanStatus').textContent=err.message || 'Face match failed';
  }finally{
    faceMatchBusy=false;
    $('faceMatch').disabled=!stream;
  }
}

$('openScanner').onclick=()=>{$('workspace').classList.remove('hidden');$('workspace').scrollIntoView({behavior:'smooth'})};
$('openDirectory').onclick=()=>{$('directory').classList.remove('hidden');$('directory').scrollIntoView({behavior:'smooth'})};
$('closeWorkspace').onclick=()=>{stopCamera();$('workspace').classList.add('hidden')};
$('closeDirectory').onclick=()=>$('directory').classList.add('hidden');
$('findBadge').onclick=()=>findCode($('badgeCode').value);
$('badgeCode').addEventListener('keydown',e=>{if(e.key==='Enter')findCode(e.target.value)});
$('stopCamera').onclick=stopCamera;
$('startCamera').onclick=startCamera;
$('faceMatch').onclick=matchFace;
$('faceApi').addEventListener('change',saveScannerConfig);
$('eventId').addEventListener('change',saveScannerConfig);
$('saveMe').onclick=()=>{
  const data={name:$('meName').value,role:$('meRole').value,interests:$('meInterests').value.split(',').map(x=>x.trim()),goals:$('meGoals').value.split(',').map(x=>x.trim())};
  localStorage.setItem('whodis-me',JSON.stringify(data)); $('savedStatus').textContent='Updated'; setTimeout(()=>$('savedStatus').textContent='Saved locally',1200);
};
function loadMe(){const m=me();$('meName').value=m.name;$('meRole').value=m.role;$('meInterests').value=m.interests.join(', ');$('meGoals').value=m.goals.join(', ')}
async function startCamera(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    $('video').srcObject=stream;
    await $('video').play();
    $('faceMatch').disabled=false;
    $('scanStatus').textContent='Camera live · QR scanning + face match ready';
    if('BarcodeDetector' in window){
      const detector=new BarcodeDetector({formats:['qr_code']});
      scanTimer=setInterval(async()=>{try{const codes=await detector.detect($('video')); if(codes.length){findCode(codes[0].rawValue); stopCamera();}}catch{}},700);
    }
  }catch(e){
    $('scanStatus').textContent='Camera permission unavailable';
    $('faceMatch').disabled=true;
  }
}
function stopCamera(){
  if(scanTimer){clearInterval(scanTimer);scanTimer=null}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  $('video').srcObject=null;
  $('faceMatch').disabled=true;
  $('scanStatus').textContent='Camera off';
}
renderDirectory();loadMe();loadScannerConfig();
