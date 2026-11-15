// Keep hold feedback outside application state: progress must not rebuild the UI.
export function installPresetPress(onHold){
 const holdDuration=700;
 let press=null,suppressedClick=null,releaseTimer=null;
 function clearPress(){
  if(!press)return;
  clearTimeout(press.timer);
  press.button.classList.remove('is-holding');
  press=null;
 }
 function cancelPending(){
  if(!press||press.completed)return;
  clearTimeout(press.timer);
  press.button.classList.remove('is-holding');
  press.canceled=true;
 }
 function release(event){
  if(!press||event.pointerId!==press.pointerId)return;
  if(press.completed||press.canceled){
   suppressedClick=press.pointerId;
   event.preventDefault();
   // A click follows pointerup in the same event sequence, even if the dialog
   // has replaced the original button. Never let that click reach a new control.
   clearTimeout(releaseTimer);
   releaseTimer=setTimeout(()=>suppressedClick=null,0);
  }
  clearPress();
 }
 document.addEventListener('pointerdown',event=>{
  if(press){cancelPending();return;}
  const button=event.target.closest('[data-preset-hold]');
  if(!button||button.disabled||event.button!==0||event.isPrimary===false)return;
  suppressedClick=null;
  const pending={button,pointerId:event.pointerId,x:event.clientX,y:event.clientY,completed:false};
  press=pending;
  button.style.setProperty('--preset-hold-duration',holdDuration+'ms');
  button.classList.add('is-holding');
  pending.timer=setTimeout(()=>{
   if(press!==pending||!button.isConnected){clearPress();return;}
   pending.completed=true;
   button.classList.remove('is-holding');
   suppressedClick=event.pointerId;
   onHold(button);
  },holdDuration);
 });
 document.addEventListener('pointermove',event=>{
  if(press&&!press.completed&&event.pointerId===press.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>10)cancelPending();
 });
 document.addEventListener('pointerup',release,{capture:true,passive:false});
 document.addEventListener('pointercancel',release,{capture:true,passive:false});
 document.addEventListener('click',event=>{
  if(suppressedClick===null)return;
  suppressedClick=null;
  event.preventDefault();
  event.stopImmediatePropagation();
 },true);
 document.addEventListener('contextmenu',event=>{if(press&&event.target.closest('[data-preset-hold]'))event.preventDefault();});
 document.addEventListener('scroll',cancelPending,true);
 document.addEventListener('wheel',cancelPending,{passive:true,capture:true});
 document.addEventListener('keydown',cancelPending);
 document.addEventListener('visibilitychange',()=>{clearPress();suppressedClick=null;});
 window.addEventListener?.('blur',()=>{clearPress();suppressedClick=null;});
 return {cancelPending};
}
