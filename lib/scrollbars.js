'use strict';
// Port of the classic scrollbar geometry used by Spyglass's scrollbar.uc.js.
function classicScrollbars(theme){
  const c=theme.colors;
  const arrow=direction=>{
    const rotations={up:180,right:270,down:0,left:90};
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><g fill="${c.text}" transform="rotate(${rotations[direction]} 8 8)"><rect x="4" y="6" width="7" height="1"/><rect x="5" y="7" width="5" height="1"/><rect x="6" y="8" width="3" height="1"/><rect x="7" y="9" width="1" height="1"/></g></svg>`;
    return 'url("data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')+'")';
  };
  return `
    ::-webkit-scrollbar{width:16px!important;height:16px!important;background:${c.face}!important}
    ::-webkit-scrollbar-track{background:repeating-conic-gradient(${c.face} 0 25%,${c.light} 0 50%) 0 0/2px 2px!important}
    ::-webkit-scrollbar-thumb,::-webkit-scrollbar-button{background-color:${c.face}!important;border:0!important;border-radius:0!important;box-shadow:inset -1px -1px ${c.dark},inset 1px 1px ${c.face},inset -2px -2px ${c.shadow},inset 2px 2px ${c.light}!important;min-height:8px!important;min-width:8px!important}
    ::-webkit-scrollbar-button{display:none!important;background-repeat:no-repeat!important;background-position:center!important}
    ::-webkit-scrollbar-button:single-button{display:block!important;width:16px!important;height:16px!important}
    ::-webkit-scrollbar-button:vertical:decrement{background-image:${arrow('up')}!important}
    ::-webkit-scrollbar-button:vertical:increment{background-image:${arrow('down')}!important}
    ::-webkit-scrollbar-button:horizontal:decrement{background-image:${arrow('left')}!important}
    ::-webkit-scrollbar-button:horizontal:increment{background-image:${arrow('right')}!important}
    ::-webkit-scrollbar-button:active{box-shadow:inset 1px 1px ${c.shadow}!important}
    ::-webkit-scrollbar-corner{background:${c.face}!important}
  `;
}
module.exports={classicScrollbars};
