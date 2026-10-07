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
function me(){ return JSON.parse(localStorage.getItem('whodis-me') || 'null') || defaultMe; }
function normalize(xs){return (xs||[]).map(x=>x.trim().toLowerCase()).filter(Boolean)}
function overlap(a,b){const B=new Set(normalize(b)); return normalize(a).filter(x=>B.has(x))}
function scoreFor(person){
  const m=me(), oi=overlap(m.interests,person.interests), og=overlap(m.goals,person.goals);
  return {score:Math.min(97,42+oi.length*11+og.length*8),oi,og};
}
function opener(person,oi){
  const focus=oi[0] || person.interests?.[0] || 'your work';
  const project=person.projects?.[0] || focus;
  return `“I saw you're working around ${focus}. I’m exploring a related direction — especially how it connects to ${String(project).toLowerCase()}. What part has been hardest to make reliable?”`;
}
function collab(person,oi){
  if(oi.includes('rag')||oi.includes('retrieval')) return 'Compare retrieval failure cases and test whether your approaches complement each other.';
  if(oi.includes('computer vision')||oi.includes('multimodal ai')) return 'Explore a small multimodal benchmark or reliability experiment together.';
  if(oi.includes('agents')) return 'Prototype an agent workflow and split product vs. evaluation responsibilities.';
  return `Trade notes on ${oi[0]||person.interests?.[0]||'your overlapping work'} and look for one concrete 1-week experiment.`;
}
function renderResult(person, faceMeta=null){
  const m=scoreFor(person);
  const faceLine = faceMeta ? `<div class="match-chip">face match · distance ${faceMeta.distance} / threshold ${faceMeta.threshold}</div>` : '';
  $('workspace').classList.remove('hidden');
  $('resultPanel').innerHTML=`
    <div class="result-top">
      <div class="avatar">${person.initials||'?'}</div>
      <div><h2>${person.name}</h2><p>${person.role||'Event attendee'} · ${person.org||'whodis event'}</p>${faceLine}</div>
      <div class="score"><b>${m.score}%</b><small>useful overlap</small></div>
    </div>
    <div class="brief">
      <div class="brief-card"><label>SHARED CONTEXT</label><div class="tags">${(m.oi.length?m.oi:['adjacent interests']).map(x=>`<span class="tag">${x}</span>`).join('')}</div></div>
      <div class="brief-card"><label>THEY'RE LOOKING FOR</label><div class="tags">${(person.goals||[]).map(x=>`<span class="tag">${x}</span>`).join('')}</div></div>
      <div class="brief-card wide"><label>WHY YOU SHOULD TALK</label><p>${collab(person,m.oi)}</p></div>
      <div class="brief-card wide"><label>BEST OPENER</label><p>${opener(person,m.oi)}</p></div>
      <div class="brief-card"><label>THEIR PROJECTS</label><p>${(person.projects||[]).join(' · ') || 'No projects added yet'}</p></div>
      <div class="brief-card"><label>OPTED-IN LINKS</label><p>${(person.links||['Event profile']).join(' · ')}</p></div>
    </div>`;
  $('workspace').scrollIntoView({behavior:'smooth'});
}
function renderDirectory(list=attendees){
  $('directoryGrid').innerHTML = list.map(p=>`<div class="person-card" data-code="${p.code}"><div class="avatar">${p.initials||'?'}</div><h4>${p.name}</h4><p>${p.role||'Event attendee'}<br>${p.org||'whodis event'}</p><div class="tags">${(p.interests||[]).slice(0,3).map(x=>`<span class="tag">${x}</span>`).join('')}</div></div>`).join('');
  document.querySelectorAll('.person-card').forEach(card=>card.addEventListener('click',()=>{const p=list.find(x=>x.code===card.dataset.code);$('directory').classList.add('hidden');renderResult(p)}));
}
function findCode(code){const p=attendees.find(x=>x.code===code.trim().toUpperCase()); if(p) renderResult(p); else $('scanStatus').textContent='Badge not found';}
function apiBase(){return $('faceApi').value.trim().replace(/\/$/,'')}
function eventId(){return $('eventId').value.trim() || 'demo-event'}
function saveScannerConfig(){localStorage.setItem('whodis-scan-config',JSON.stringify({faceApi:$('faceApi').value.trim(),eventId:eventId()}))}
function loadScannerConfig(){
  const cfg=JSON.parse(localStorage.getItem('whodis-scan-config')||'null');
  if(cfg?.faceApi)$('faceApi').value=cfg.faceApi;
  if(cfg?.eventId)$('eventId').value=cfg.eventId;
  $('joinFaceApi').value=$('faceApi').value; $('joinEventId').value=$('eventId').value;
}
async function captureFrameBlob(){
  const video=$('video'); if(!stream||!video.videoWidth||!video.videoHeight) throw new Error('Camera is not ready');
  const canvas=$('captureCanvas'), maxW=960, scale=Math.min(1,maxW/video.videoWidth);
  canvas.width=Math.round(video.videoWidth*scale); canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not capture frame')),'image/jpeg',0.9));
}
async function matchFace(){
  if(faceMatchBusy||!stream)return;
  faceMatchBusy=true; $('faceMatch').disabled=true; $('scanStatus').textContent='Matching against opted-in attendees…'; saveScannerConfig();
  try{
    const form=new FormData(); form.append('photo',await captureFrameBlob(),'capture.jpg');
    const response=await fetch(`${apiBase()}/events/${encodeURIComponent(eventId())}/match`,{method:'POST',body:form});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.detail||`Face API error ${response.status}`);
    if(!data.matched||!data.profile){$('scanStatus').textContent='No confident match in this event';return}
    $('scanStatus').textContent='matched. ohhh, whodis.';
    renderResult(data.profile,{distance:data.distance,threshold:data.threshold});
  }catch(err){$('scanStatus').textContent=err.message||'Face match failed'}
  finally{faceMatchBusy=false;$('faceMatch').disabled=!stream}
}
function initialsFromName(name){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'?'}
function slugId(name){const core=name.trim().toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'ATTENDEE';return `WD-${core}`}
function joinApiBase(){return $('joinFaceApi').value.trim().replace(/\/$/,'')}
function joinEventId(){return $('joinEventId').value.trim()||'demo-event'}
function joinProfile(){
  const name=$('joinName').value.trim(), roleRaw=$('joinRole').value.trim(), [role,...orgParts]=roleRaw.split('·').map(x=>x.trim());
  return {code:slugId(name),name,initials:initialsFromName(name),role:role||'Event attendee',org:orgParts.join(' · ')||'whodis event',
    interests:$('joinInterests').value.split(',').map(x=>x.trim()).filter(Boolean),
    goals:$('joinGoals').value.split(',').map(x=>x.trim()).filter(Boolean),
    projects:$('joinProjects').value.split(',').map(x=>x.trim()).filter(Boolean),links:['Event profile']};
}
function refreshJoinPreview(){
  const p=joinProfile(); $('joinAvatar').textContent=p.initials; $('joinPreviewName').textContent=p.name||'your profile card';
  $('joinPreviewRole').textContent=`${p.role} · ${p.org}`; $('joinPreviewTags').innerHTML=p.interests.slice(0,4).map(x=>`<span class="tag">${x}</span>`).join('');
}
async function enrollAttendee(){
  const p=joinProfile(), photo=$('joinPhoto').files[0];
  if(!p.name){$('joinStatus').textContent='add your name first';return}
  if(!$('joinConsent').checked){$('joinStatus').textContent='consent is required';return}
  if(!photo){$('joinStatus').textContent='choose or take a selfie';return}
  $('enrollBtn').disabled=true; $('joinStatus').textContent='creating face embedding + shared profile…';
  try{
    const form=new FormData();
    form.append('attendee_id',p.code); form.append('display_name',p.name); form.append('role',p.role); form.append('org',p.org);
    form.append('initials',p.initials); form.append('interests',p.interests.join(',')); form.append('goals',p.goals.join(','));
    form.append('projects',p.projects.join(',')); form.append('links',p.links.join(',')); form.append('consent','true'); form.append('photo',photo);
    const response=await fetch(`${joinApiBase()}/events/${encodeURIComponent(joinEventId())}/enroll`,{method:'POST',body:form});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.detail||`Enrollment failed (${response.status})`);
    localStorage.setItem('whodis-scan-config',JSON.stringify({faceApi:joinApiBase(),eventId:joinEventId()}));
    $('faceApi').value=joinApiBase(); $('eventId').value=joinEventId();
    $('joinStatus').textContent=`enrolled as ${data.profile?.code||p.code} · profile is now shared across devices`;
  }catch(err){$('joinStatus').textContent=err.message||'enrollment failed'}
  finally{$('enrollBtn').disabled=false}
}
async function loadEventDirectory(){
  try{
    const response=await fetch(`${apiBase()}/events/${encodeURIComponent(eventId())}/attendees`);
    if(!response.ok) throw new Error();
    const data=await response.json();
    if(data.attendees?.length) renderDirectory(data.attendees);
    else renderDirectory(attendees);
  }catch{renderDirectory(attendees)}
}

$('openScanner').onclick=()=>{$('workspace').classList.remove('hidden');$('workspace').scrollIntoView({behavior:'smooth'})};
$('openJoin').onclick=()=>{$('joinPanel').classList.remove('hidden');$('joinPanel').scrollIntoView({behavior:'smooth'})};
$('closeJoin').onclick=()=>$('joinPanel').classList.add('hidden');
$('openDirectory').onclick=async()=>{$('directory').classList.remove('hidden');await loadEventDirectory();$('directory').scrollIntoView({behavior:'smooth'})};
$('closeWorkspace').onclick=()=>{stopCamera();$('workspace').classList.add('hidden')};
$('closeDirectory').onclick=()=>$('directory').classList.add('hidden');
$('findBadge').onclick=()=>findCode($('badgeCode').value);
$('badgeCode').addEventListener('keydown',e=>{if(e.key==='Enter')findCode(e.target.value)});
$('stopCamera').onclick=stopCamera; $('startCamera').onclick=startCamera; $('faceMatch').onclick=matchFace;
$('faceApi').addEventListener('change',saveScannerConfig); $('eventId').addEventListener('change',saveScannerConfig);
$('enrollBtn').onclick=enrollAttendee;
['joinName','joinRole','joinInterests','joinGoals','joinProjects'].forEach(id=>$(id).addEventListener('input',refreshJoinPreview));
$('saveMe').onclick=()=>{const data={name:$('meName').value,role:$('meRole').value,interests:$('meInterests').value.split(',').map(x=>x.trim()),goals:$('meGoals').value.split(',').map(x=>x.trim())};localStorage.setItem('whodis-me',JSON.stringify(data));$('savedStatus').textContent='Updated';setTimeout(()=>$('savedStatus').textContent='Saved locally',1200)};
function loadMe(){const m=me();$('meName').value=m.name;$('meRole').value=m.role;$('meInterests').value=m.interests.join(', ');$('meGoals').value=m.goals.join(', ')}
async function startCamera(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}); $('video').srcObject=stream; await $('video').play();
    $('faceMatch').disabled=false; $('scanStatus').textContent='Camera live · QR scanning + face match ready';
    if('BarcodeDetector'in window){const detector=new BarcodeDetector({formats:['qr_code']});scanTimer=setInterval(async()=>{try{const codes=await detector.detect($('video'));if(codes.length){findCode(codes[0].rawValue);stopCamera()}}catch{}},700)}
  }catch{$('scanStatus').textContent='Camera permission unavailable';$('faceMatch').disabled=true}
}
function stopCamera(){if(scanTimer){clearInterval(scanTimer);scanTimer=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$('video').srcObject=null;$('faceMatch').disabled=true;$('scanStatus').textContent='Camera off'}
renderDirectory(); loadMe(); loadScannerConfig(); refreshJoinPreview();
