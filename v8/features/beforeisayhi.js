WhoDisFeatures.register({
  id:'beforeisayhi', label:'Before I Say Hi', kicker:'CONVERSATION PREP', order:10,
  run({person,me},api){
    const shared=person.shared?.[0] || 'their current work';
    const project=person.projects?.[0] || 'their latest project';
    const opener=person.opener || `I noticed your work around ${shared}. What part has been hardest to make reliable?`;
    return `
      <div class="wd-card"><b>Open with this</b><p>${api.escape(opener)}</p></div>
      <div class="wd-card"><b>Make it memorable</b><p>Connect ${api.escape(shared)} to something you have actually built or tested. Keep the first 30 seconds about their work, not your résumé.</p></div>
      <div class="wd-card"><b>Best follow-up</b><p>“On ${api.escape(project)}, what assumption turned out to be wrong once you tested it for real?”</p></div>
      <div class="wd-card"><b>Skip this</b><p>Generic praise, “I read your profile,” or asking for an opportunity before you have established a real overlap.</p></div>`;
  }
});