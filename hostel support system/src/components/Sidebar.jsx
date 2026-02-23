// css import
import '../index.css';

// react functionalities import 

// pages import


// components import


// hooks import



function Sidebar() {

  const options = [
    [
      'Complaints',
      <ComplaintSVG />,
      [
        'Submit a complaint',
        'Check complaint status'
      ]
    ],
    [
      'Leave',
      <LeaveSVG />,
      [
        'Apply for leave',
        'Check leave application status'
      ]
    ],
    [
      'Mess',
      <MessSVG />,
      [
        'Check menu',
        'Share feedback',
        'Request for alternative food'
      ]
    ],
    [
      'Room',
      <RoomSVG />,
      [
        'Apply for room change',
        'Check room change status',
        'Request for new key'
      ]
    ],
    [
      'Lost and Found',
      <LostAndFoundSVG />,
      [
        'Report a lost item',
        'Report a found item',
        'View reported found items',
        'View reported lost items'
      ]
    ],
    [
      'Announcements',
      <AnnouncementSVG />,
      [
        'View announcements',
        'Request an announcement'
      ]
    ]
  ];

  return (
    <div className='sidebar-outer'>
      <h1 className='title'>Hostel<br></br>Link</h1>
      <div className='sidebar-options'>
        {
          options.map(o => {
            return (
              <SidebarOption key={crypto.randomUUID()} name = {o[0]} icon={o[1]} extensions={o[2]} />
            );
          })
        }
      </div>
    </div>
  );
}

function SidebarOption({name, icon, extensions}) {
  return (
    <div className='sidebar-option'>
      {icon}
      <h3 className='sidebar-option-name'>{name}</h3>
      <ArrowSVG></ArrowSVG>
      <div className='sidebar-option-extension'>
        {
          extensions.map(ext => {
            return (
              <div className='sidebar-extended-option' key={crypto.randomUUID()}>
                {ext}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

const ArrowSVG = () => {
  return (
    <svg width="26" height="16" viewBox="0 0 26 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="-3" x2="15.4312" y2="-3" transform="matrix(0.708887 -0.705322 0.708887 0.705322 12.9343 15.9924)" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <line x1="3" y1="-3" x2="15.4312" y2="-3" transform="matrix(0.708887 0.705322 -0.708887 0.705322 0 2.99268)" stroke="white" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
}

const ComplaintSVG = () => {
  return (
    <svg fill="#ffffff" viewBox="-2 0 19 19" xmlns="http://www.w3.org/2000/svg" className="cf-icon-svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M14.032 5.286v7.276a1.112 1.112 0 0 1-1.108 1.108H8.75l-1.02 1.635a.273.273 0 0 1-.503 0l-1.02-1.635h-4.13a1.112 1.112 0 0 1-1.109-1.108V5.286a1.112 1.112 0 0 1 1.108-1.108h10.848a1.112 1.112 0 0 1 1.108 1.108zM8.206 11.34a.706.706 0 1 0-.706.705.706.706 0 0 0 .706-.705zm-1.26-1.83a.554.554 0 1 0 1.108 0V6.275a.554.554 0 1 0-1.108 0z"></path></g></svg>
  );
}

const LeaveSVG = () => {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fillRule="evenodd" clipRule="evenodd" d="M15.6666 8L17.75 10.5L15.6666 8Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> <path fillRule="evenodd" clipRule="evenodd" d="M15.6666 13L17.75 10.5L15.6666 13Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M16.5 10.5L10 10.5" stroke="#000000" strokeWidth="2" strokeLinecap="round"></path> <line x1="4" y1="3.5" x2="13" y2="3.5" stroke="#000000" strokeWidth="2" strokeLinecap="round"></line> <line x1="4" y1="17.5" x2="13" y2="17.5" stroke="#000000" strokeWidth="2" strokeLinecap="round"></line> <path d="M13 3.5V7.5" stroke="#000000" strokeWidth="2" strokeLinecap="round"></path> <path d="M13 13.5V17.5" stroke="#000000" strokeWidth="2" strokeLinecap="round"></path> <path d="M4 3.5L4 17.5" stroke="#000000" strokeWidth="2" strokeLinecap="round"></path> </g></svg>
  );
}

const MessSVG = () => {
  return (
    <svg fill="#ffffff" viewBox="0 -3.84 122.88 122.88" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" xmlSpace="preserve" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M29.03,100.46l20.79-25.21l9.51,12.13L41,110.69C33.98,119.61,20.99,110.21,29.03,100.46L29.03,100.46z M53.31,43.05 c1.98-6.46,1.07-11.98-6.37-20.18L28.76,1c-2.58-3.03-8.66,1.42-6.12,5.09L37.18,24c2.75,3.34-2.36,7.76-5.2,4.32L16.94,9.8 c-2.8-3.21-8.59,1.03-5.66,4.7c4.24,5.1,10.8,13.43,15.04,18.53c2.94,2.99-1.53,7.42-4.43,3.69L6.96,18.32 c-2.19-2.38-5.77-0.9-6.72,1.88c-1.02,2.97,1.49,5.14,3.2,7.34L20.1,49.06c5.17,5.99,10.95,9.54,17.67,7.53 c1.03-0.31,2.29-0.94,3.64-1.77l44.76,57.78c2.41,3.11,7.06,3.44,10.08,0.93l0.69-0.57c3.4-2.83,3.95-8,1.04-11.34L50.58,47.16 C51.96,45.62,52.97,44.16,53.31,43.05L53.31,43.05z M65.98,55.65l7.37-8.94C63.87,23.21,99-8.11,116.03,6.29 C136.72,23.8,105.97,66,84.36,55.57l-8.73,11.09L65.98,55.65L65.98,55.65z"></path> </g> </g></svg>
  );
}

const RoomSVG = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 21H21M18 21V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.0799 6 6.2V21M15 12H15.01" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
  );
}

const LostAndFoundSVG = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12 19H12.01M8.21704 7.69689C8.75753 6.12753 10.2471 5 12 5C14.2091 5 16 6.79086 16 9C16 10.6565 14.9931 12.0778 13.558 12.6852C12.8172 12.9988 12.4468 13.1556 12.3172 13.2767C12.1629 13.4209 12.1336 13.4651 12.061 13.6634C12 13.8299 12 14.0866 12 14.6L12 16" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
  );
}

const AnnouncementSVG = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M22 7.99992V11.9999M10.25 5.49991H6.8C5.11984 5.49991 4.27976 5.49991 3.63803 5.82689C3.07354 6.11451 2.6146 6.57345 2.32698 7.13794C2 7.77968 2 8.61976 2 10.2999L2 11.4999C2 12.4318 2 12.8977 2.15224 13.2653C2.35523 13.7553 2.74458 14.1447 3.23463 14.3477C3.60218 14.4999 4.06812 14.4999 5 14.4999V18.7499C5 18.9821 5 19.0982 5.00963 19.1959C5.10316 20.1455 5.85441 20.8968 6.80397 20.9903C6.90175 20.9999 7.01783 20.9999 7.25 20.9999C7.48217 20.9999 7.59826 20.9999 7.69604 20.9903C8.64559 20.8968 9.39685 20.1455 9.49037 19.1959C9.5 19.0982 9.5 18.9821 9.5 18.7499V14.4999H10.25C12.0164 14.4999 14.1772 15.4468 15.8443 16.3556C16.8168 16.8857 17.3031 17.1508 17.6216 17.1118C17.9169 17.0756 18.1402 16.943 18.3133 16.701C18.5 16.4401 18.5 15.9179 18.5 14.8736V5.1262C18.5 4.08191 18.5 3.55976 18.3133 3.2988C18.1402 3.05681 17.9169 2.92421 17.6216 2.88804C17.3031 2.84903 16.8168 3.11411 15.8443 3.64427C14.1772 4.55302 12.0164 5.49991 10.25 5.49991Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
  );
}

export default Sidebar;