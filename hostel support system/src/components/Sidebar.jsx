// css import
import '../index.css';

// react functionalities import 

import { useState, useEffect } from 'react';

// pages import


// components import


// hooks import



function Sidebar({options, changePage}) {

  let defaultState = [];
  for(let i = 0; i < options.length; i++) {
    defaultState.push(false);
  }
  const [optionsState, setOptionsState] = useState(defaultState);
  
  // Mobile sidebar state
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleArrowClick = (i) => {
    const newState = [];
    for(let j = 0; j < options.length; j++) {
      if(j == i) newState.push(!optionsState[i]);
      else newState.push(false);
    }
    setOptionsState(newState);
  }

  const handleMobileToggle = () => {
    setIsMobileOpen(!isMobileOpen);
  }

  return (
    <>
      {/* Overlay for mobile - outside sidebar so it covers the rest of screen */}
      {isMobile && isMobileOpen && (
        <div className='sidebar-overlay' onClick={handleMobileToggle}></div>
      )}
      <div className={`sidebar-outer ${isMobile && !isMobileOpen ? 'mobile-closed' : ''}`}>
        <div className={`sidebar-inner ${isMobile && !isMobileOpen ? 'mobile-closed' : ''}`}>
          <h1 className='sidebar-title'>Hostel<br></br>Link</h1>
          <div className='sidebar-options'>
            {
              options.map((o, i) => {
                return (
                  <SidebarOption key={crypto.randomUUID()} name = {o.name} icon={o.svg} extensions={o.actions} state={optionsState[i]} setState={() => handleArrowClick(i)} changePage={changePage} isMobile={isMobile} onOptionClick={handleMobileToggle} />
                );
              })
            }
          </div>
          <div className='sidebar-profile-row'></div>
        </div>
        {/* Mobile toggle arrow */}
        {isMobile && (
          <div className={`sidebar-mobile-toggle ${isMobileOpen ? 'open' : ''}`} onClick={handleMobileToggle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {isMobileOpen ? (
                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </div>
        )}
      </div>
    </>
  );
}

function SidebarOption({name, icon, extensions, state, setState, changePage, isMobile, onOptionClick}) {
  const handleOptionClick = () => {
    if (isMobile && onOptionClick) {
      onOptionClick();
    }
  };

  return (
    <div className='sidebar-option' onClick={handleOptionClick}>
      {icon}
      <h3 className='sidebar-option-name'>{name}</h3>
      <div className={`sidebar-option-extension ${state ? 'extended' : 'closed'}`}>
        {
          extensions.map(ext => {
            return (
              <div className='sidebar-extended-option' key={crypto.randomUUID()} onClick={() => { changePage(ext.id); }}>
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
    <svg onClick={(e) => {
      e.stopPropagation();
      setState();
    }} width="26" height="16" viewBox="0 0 26 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="-3" x2="15.4312" y2="-3" transform="matrix(0.708887 -0.705322 0.708887 0.705322 12.9343 15.9924)" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <line x1="3" y1="-3" x2="15.4312" y2="-3" transform="matrix(0.708887 0.705322 -0.708887 0.705322 0 2.99268)" stroke="white" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
}


export default Sidebar;