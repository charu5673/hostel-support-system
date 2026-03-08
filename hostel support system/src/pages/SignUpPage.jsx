import '../index.css';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { useState } from 'react';

import { useAlert } from '../contexts/useAlert';


function SignUpPage() {

  const navigate = useNavigate();

  const select = useRef();

  const { showAlert } = useAlert();

  const [studentSignup, setStudentSignup] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const user_type = select.current.value;
    const room = e.target.room.value;
    const roll_no = e.target.roll.value;

    if(user_type == "Student" && (!room || !roll_no)) {
      showAlert("Room and roll no. are required for student signup!", "error");
      return;
    }

    const res = await fetch("http://localhost:5000/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: studentSignup ? JSON.stringify({ name, email, password, user_type, room, roll_no }) : JSON.stringify({ name, email, password, user_type }),
    });

    const data = await res.json();

    const status = res.status == 200 || res.status == 201 ? "info" : "error";

    showAlert(data.message, status);

  };

  const handleSelectChange = () => {
    setStudentSignup(select.current.value == "student")
  }


  return (
    <div className='signup-page-outer'>
      <h1 className='title'>Hostel<br></br>Link</h1>
      <form className='action-div' onSubmit={handleSubmit}>
        <h2 className='action-text'>Create an account</h2>
        <input id='name' name='name' placeholder='Name' type='text'></input>
        <input id='email' name='email' placeholder='Email' type='email'></input>
        <input id='password' name='password' placeholder='Password' type='password'></input>
        <select name='user_type' id='user_type' ref={select} onChange={handleSelectChange}>
          <option value={'student'}>Student</option>
          <option value={'warden'}>Warden</option>
          <option value={'mess'}>Mess Manager</option>
        </select>
        {
          studentSignup ? (
            <div className='student-options'>
              <input id='room' name='room' placeholder='Room No.' type='number'></input>
              <input id='roll' name='roll' placeholder='Roll No.' type='number'></input>
            </div>
          ) : null
        }
        <button className='signup-btn' type='submit'>Sign up</button>
        <p className='login-nav'>Already have an account? <span onClick={() => navigate('/login')} className='bold-text'>Login</span></p>
      </form>
    </div>
  );
}

export default SignUpPage;