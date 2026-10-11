(function(){
  function wire(){
    const form=document.querySelector('#coverage-form');
    if(!form||form.dataset.ready)return;
    form.dataset.ready='1';
    form.addEventListener('submit',function(event){
      event.preventDefault();
      const field=form.querySelector('[name="location"]'), result=form.querySelector('.coverage-result');
      const value=(field.value||'').trim().toLowerCase();
      const areas=(window.__INITIAL_CONTENT__?.areas||[]).map(function(area){return [area.title,area.slug,area.description].filter(Boolean).join(' ').toLowerCase();});
      const match=value.length>1&&areas.some(function(area){return area.includes(value)||value.split(/\s+/).some(function(part){return part.length>2&&area.includes(part);});});
      result.textContent=match?'This location appears to be within a published service area. Submit a consultation so the team can confirm availability.':'We don’t see that location in the published service areas yet. Submit a consultation and include your city or ZIP code so the team can confirm coverage.';
      result.classList.toggle('is-match',!!match); result.classList.add('is-visible');
    });
  }
  new MutationObserver(wire).observe(document.documentElement,{childList:true,subtree:true});
  wire();
})();
