// css import
import '../index.css';

// react functionalities import 
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

// pages import


// components import


// hooks import


function SignUpPage() {

  const navigate = useNavigate();

  const select = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    const user_type = select.current.value;

    const res = await fetch("http://127.0.0.1:5000/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, user_type }),
    });

    const data = await res.json();
    alert(data.message);
  };


  return (
    <div className='signup-page-outer'>
      <h1 className='title'>Hostel<br></br>Link</h1>
      <form className='action-div' onSubmit={handleSubmit}>
        <h2 className='action-text'>Create an account</h2>
        <input id='email' name='email' placeholder='Email' type='email'></input>
        <input id='password' name='password' placeholder='Password' type='password'></input>
        <select name='user_type' id='user_type' ref={select}>
          <option value={'Student'}>Student</option>
          <option value={'Warden'}>Warden</option>
          <option value={'Mess'}>Mess Manager</option>
        </select>
        <button className='signup-btn' type='submit'>Sign up</button>
        <p className='login-nav'>Already have an account? <span onClick={() => navigate('/login')} className='bold-text'>Login</span></p>
      </form>
    </div>
  );
}

export default SignUpPage;