import '../index.css';
import { Constants } from '../data/Constants';
import { useLoading } from '../contexts/loading/useLoading';
import { useAlert } from '../contexts/alert/useAlert';
import { Navigate, useNavigate } from 'react-router-dom';
import { useConfirm } from '../contexts/confirm/useConfirm';

function TopBar({ handleBack }) {

  const { loadingFetch } = useLoading();
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const navigate = useNavigate();

  const handleLogout = async () => {

    if(! await showConfirm("Log out from this account?")) return;

    const res = await loadingFetch(`${Constants.API}${Constants.ROUTES.LOGOUT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
    if(res.status == 200) {
      setTimeout(() => {
        sessionStorage.clear();
        navigate('/login');
      }, 2000);
    }
  }

  return (
    <div className='top-bar-outer'>
      <svg className="back-button" onClick={handleBack} viewBox="-1.6 -1.6 19.20 19.20" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="0.00016"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M1 6V15H6V11C6 9.89543 6.89543 9 8 9C9.10457 9 10 9.89543 10 11V15H15V6L8 0L1 6Z"></path> </g></svg>
      <button className='logout-button' onClick={handleLogout}>Logout</button>
    </div>
  )
}

export default TopBar;