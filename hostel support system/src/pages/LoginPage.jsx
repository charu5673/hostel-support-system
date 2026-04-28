import '../index.css';
import { useNavigate } from 'react-router-dom';

import { useAlert } from '../contexts/alert/useAlert';
import { useLoading } from '../contexts/loading/useLoading';
import { Constants } from '../data/Constants';


function LoginPage() {

  const navigate = useNavigate();
  
  const { showAlert } = useAlert();
  const { loadingFetch } = useLoading();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;

    const res = await loadingFetch(`${Constants.API}${Constants.ROUTES.LOGIN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
    if(res.status == 200) {
      setTimeout(() => {
        sessionStorage.clear();
        navigate('/');
      }, 2000);
    }
  };

  return (
    <div className='login-page-outer'>
      <h1 className='title'>Hostel<br></br>Link</h1>
      <form className='action-div' onSubmit={handleSubmit}>
        <h2 className='action-text'>Login to your account</h2>
        <input id='email' name='email' placeholder='Email' type='email'></input>
        <input id='password' name='password' placeholder='Password' type='password'></input>
        <button className='login-btn'>Login</button>
        <p className='sign-nav'>Don't have an account? <span onClick={() => navigate('/signup')} className='bold-text'>Sign Up</span></p>
        <p className='forgot-pass'>Forgot Password? <span onClick={() => navigate('/forgot-password')} className='bold-text'>Reset Password</span></p>
      </form>
    </div>
  );
}

export default LoginPage;