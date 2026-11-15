let outputResizeObserver=null;

// Row spans pack cards without changing their DOM or keyboard order.
export function layoutOutputCards(){
 outputResizeObserver?.disconnect();
 outputResizeObserver=null;
 const grid=document.querySelector?.('.output-cards');
 if(!grid||typeof ResizeObserver==='undefined')return;
 const cards=[...grid.querySelectorAll('.output-card')];
 grid.classList.add('is-masonry');
 function arrange(){
  const gap=parseFloat(getComputedStyle(grid).columnGap)||0;
  const spans=cards.map(card=>Math.ceil(card.getBoundingClientRect().height+gap));
  cards.forEach((card,index)=>{const span='span '+spans[index];if(card.style.gridRowEnd!==span)card.style.gridRowEnd=span;});
 }
 arrange();
 outputResizeObserver=new ResizeObserver(arrange);
 outputResizeObserver.observe(grid);
 cards.forEach(card=>outputResizeObserver.observe(card));
}
