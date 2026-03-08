// css import
import '../index.css';

// react functionalities import 

import { useState } from 'react';

// pages import


// components import


// hooks import



function Sidebar({options, changePage}) {

  let defaultState = [];
  for(let i = 0; i < options.length; i++) {
    defaultState.push(false);
  }
  const [optionsState, setOptionsState] = useState(defaultState);

  const handleArrowClick = (i) => {
    const newState = [];
    for(let j = 0; j < options.length; j++) {
      if(j == i) newState.push(!optionsState[i]);
      else newState.push(false);
    }
    setOptionsState(newState);
  }

  return (
    <div className='sidebar-outer'>
      <h1 className='sidebar-title'>Hostel<br></br>Link</h1>
      <div className='sidebar-options'>
        {
          options.map((o, i) => {
            return (
              <SidebarOption key={crypto.randomUUID()} name = {o.name} icon={o.svg} extensions={o.actions} state={optionsState[i]} setState={() => handleArrowClick(i)} changePage={changePage} />
            );
          })
        }
      </div>
    </div>
  );
}

function SidebarOption({name, icon, extensions, state, setState, changePage}) {
  return (
    <div className='sidebar-option'>
      {icon}
      <h3 className='sidebar-option-name'>{name}</h3>
      <div className={`sidebar-option-extension ${state ? 'extended' : 'closed'}`}>
        {
          extensions.map(ext => {
            return (
              <div className='sidebar-extended-option' key={crypto.randomUUID()} onClick={() => changePage(ext.id)}>
                {ext.name}
              </div>
            );
          })
        }
      </div>
      <ArrowSVG setState={setState} ></ArrowSVG>
    </div>
  );
}

const ArrowSVG = ({setState}) => {
  return (
    <svg onClick={() => setState()} width="26" height="16" viewBox="0 0 26 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="-3" x2="15.4312" y2="-3" transform="matrix(0.708887 -0.705322 0.708887 0.705322 12.9343 15.9924)" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <line x1="3" y1="-3" x2="15.4312" y2="-3" transform="matrix(0.708887 0.705322 -0.708887 0.705322 0 2.99268)" stroke="white" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
}


export default Sidebar;