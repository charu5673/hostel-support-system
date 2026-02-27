// css import
import '../index.css';

// react functionalities import 
import { useNavigate } from 'react-router-dom';

// pages import


// components import


// hooks import


function LoginPage() {

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;

    const res = await fetch("http://127.0.0.1:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    alert(data.message);
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
      </form>
    </div>
  );
}

export default LoginPage;