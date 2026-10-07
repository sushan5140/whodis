(() => {
  window.whodisRunWho2Meet=function(){
    const input=document.querySelector('[data-w2m-input]');
    const out=document.querySelector('[data-w2m-output]');
    if(!input||!out) return;
    const me=JSON.parse(localStorage.getItem('whodis-me')||'null')||{interests:['RAG','multimodal AI','computer vision','agents','research'],goals:['research collaborators','mentors','startup builders']};
    const terms=[...(me.interests||[]),...(me.goals||[])].map(x=>x.toLowerCase());
    const rows=input.value.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{
      const l=line.toLowerCase();
      const hits=terms.filter(t=>l.includes(t));
      const signal=(/(prof|research|founder|engineer|lab|open source|ai|ml)/i.test(line)?5:0);
      return {line,hits,score:hits.length*8+signal};
    }).sort((a,b)=>b.score-a.score).slice(0,3);
    localStorage.setItem('whodis-event-board',input.value);
    out.innerHTML=rows.length?rows.map((r,i)=>`<div class="wd-card"><b>${i+1}. ${WhoDisFeatures.escape(r.line)}</b><p>${r.hits.length?'Why you: '+r.hits.map(WhoDisFeatures.escape).join(', '):'Why you: strong role/context signal; verify relevance before approaching.'}</p></div>`).join(''):'<p class="wd-muted">No event people/items pasted yet.</p>';
  };
  WhoDisFeatures.register({
    id:'who2meet', label:'Who should I meet?', kicker:'WHO2MEET', order:80, scope:'event',
    run(){
      const saved=localStorage.getItem('whodis-event-board')||'';
      return `<div class="wd-card"><b>Turn the event into a hit list</b><p>Paste the public event list. whodis ranks only against your saved interests/goals; it does not invent hidden relationships.</p>
        <textarea class="wd-input" rows="7" data-w2m-input placeholder="One public person / booth / session per line">${WhoDisFeatures.escape(saved)}</textarea>
        <button class="wd-mini-btn" onclick="whodisRunWho2Meet()">Give me my top 3</button></div>
        <div data-w2m-output></div>`;
    }
  });
})();