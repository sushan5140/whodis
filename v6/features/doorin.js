WhoDisFeatures.register({
  id:'doorin', label:'What can I offer?', kicker:'DOOR IN', order:20,
  run({person,me},api){
    const shared=person.shared?.[0] || me.interests?.[0] || 'AI';
    const project=person.projects?.[0] || 'their current project';
    const ideas=[
      `Turn “${project}” into a tiny interactive demo or reproducible notebook.`,
      `Offer a focused failure-case audit around ${shared} instead of a vague “happy to help.”`,
      `Send one concrete comparison, benchmark, or UI prototype they can react to in under 2 minutes.`
    ];
    return `<div class="wd-score">value first.</div>
      ${ideas.map((x,i)=>`<div class="wd-card"><b>${i===0?'Best entry move':'Backup move '+(i+1)}</b><p>${api.escape(x)}</p></div>`).join('')}
      <div class="wd-card"><b>The rule</b><p>Do not ask “how can I help?” Bring something specific enough that they can say yes/no immediately.</p></div>`;
  }
});