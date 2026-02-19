// css import
import '../index.css';

// react functionalities import 
import { useNavigate } from 'react-router-dom';

// pages import


// components import


// hooks import


function SignUpPage() {

  const navigate = useNavigate();

  return (
    <div className='signup-page-outer'>
      <h1 className='title'>Hostel<br></br>Link</h1>
      <div className='action-div'>
        <h2 className='action-text'>Create an account</h2>
        <input id='email-input' placeholder='Email'></input>
        <input id='password-input' placeholder='Password'></input>
        <button className='signup-btn'>Sign up</button>
        <p className='login-nav'>Already have an account? <span onClick={() => navigate('/login')} className='bold-text'>Login</span></p>
      </div>
    </div>
  );
}

export default SignUpPage;