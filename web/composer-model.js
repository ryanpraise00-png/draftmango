/* Inert composer control retained while the AI engine is absent. */
(() => {
  function mount(parent) {
    const element=document.createElement('span');element.className='ws-model-picker';
    const trigger=document.createElement('button');trigger.type='button';trigger.className='ws-model-select';trigger.disabled=true;
    trigger.setAttribute('aria-label','AI model unavailable');trigger.title='The AI builder has been removed';
    const label=document.createElement('span');label.className='ws-model-label';label.textContent='AI unavailable';
    trigger.append(label);element.append(trigger);parent.append(element);
    return {element,sync(){},destroy(){element.remove();}};
  }
  globalThis.DraftmangoComposerModel=Object.freeze({mount});
})();
