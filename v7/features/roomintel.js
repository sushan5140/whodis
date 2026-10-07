(() => {
  window.whodisRunRoomIntel=function(){
    const input=document.querySelector('[data-room-input]');
    const out=document.querySelector('[data-room-output]');
    if(!input||!out) return;
    const me=JSON.parse(localStorage.getItem('whodis-me')||'null')||{interests:['RAG','multimodal AI','computer vision','agents','research']};
    const interests=(me.interests||[]).map(x=>x.toLowerCase());
    const lines=input.value.split('\n').map(x=>x.trim()).filter(Boolean);
    const ranked=lines.map(line=>{
      const lower=line.toLowerCase();
      const hits=interests.filter(x=>lower.includes(x));
      return {line,hits,score:hits.length*10 + (/(prof|research|founder|lab|ai|ml|vision|agent)/i.test(line)?4:0)};
    }).sort((a,b)=>b.score-a.score).slice(0,5);
    localStorage.setItem('whodis-event-board',input.value);
    out.innerHTML=ranked.length?ranked.map((x,i)=>`<div class="wd-card"><b>#${i+1} · ${WhoDisFeatures.escape(x.line)}</b><p>${x.hits.length?'matches: '+x.hits.map(WhoDisFeatures.escape).join(', '):'adjacent signal — inspect manually before prioritizing'}</p></div>`).join(''):'<p class="wd-muted">Paste at least one public speaker, booth, session, or attendee line.</p>';
  };
  WhoDisFeatures.register({
    id:'roomintel', label:'Room Intel', kicker:'EVENT MODE', order:70, scope:'event',
    run(){
      const saved=localStorage.getItem('whodis-event-board')||'';
      return `<div class="wd-card"><b>Paste the room</b><p>Use a public agenda, speaker list, sponsor board, booth list, or attendee names you were given access to. One item per line.</p>
        <textarea class="wd-input" rows="7" data-room-input placeholder="Prof. Kim — Multimodal Retrieval\nOpen Model Guild — Agent Evaluation\nStartup Alley — Education AI">${WhoDisFeatures.escape(saved)}</textarea>
        <button class="wd-mini-btn" onclick="whodisRunRoomIntel()">Rank my room</button></div>
        <div data-room-output></div>`;
    }
  });
})();