// css import
import '../index.css';

// react functionalities import 
import { useNavigate } from 'react-router-dom';

// pages import


// components import


// hooks import


function LoginPage() {

  const navigate = useNavigate();

  return (
    <div className='login-page-outer'>
      <h1 className='title'>Hostel<br></br>Link</h1>
      <div className='action-div'>
        <h2 className='action-text'>Login to your account</h2>
        <input id='email-input' placeholder='Email'></input>
        <input id='password-input' placeholder='Password'></input>
        <button className='login-btn'>Login</button>
        <p className='sign-nav'>Don't have an account? <span onClick={() => navigate('/signup')} className='bold-text'>Sign Up</span></p>
      </div>
    </div>
  );
}

export default LoginPage;