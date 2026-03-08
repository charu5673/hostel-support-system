import '../../index.css';
import { useRef } from 'react';
import { Constants } from '../../data/Constants';
import { useAlert } from '../../contexts/useAlert';
import BackButton from '../../components/BackButton';

function MakeComplaint({ user, handleBack }) {

  const typeSelect = useRef();
  const prioritySelect = useRef();
  const { showAlert } = useAlert();

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const roll_no = e.target.roll.value;
    const room = e.target.room.value;
    const type = typeSelect.current.value;
    const description = e.target.description.value;
    const priority = prioritySelect.current.value;
  
    const res = await fetch(`${Constants.API}/submit-complaint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ roll_no, room, type, description, priority }),
    });
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
  };

  return (
    <div className="make-complaint-outer">
      <form className='complaint-form' onSubmit={handleSubmit}>
        <div className='complaint-top-row'>
          <h2>Submit a complaint</h2>
          <BackButton handleBack={handleBack} />
        </div>
        <label htmlFor='roll'>Roll No.</label>
        <input disabled id="roll" name="roll" value={user.roll_no} placeholder={user.roll_no} />
        <label htmlFor='room'>Room</label>
        <input disabled id="room" name="room" value={user.room} placeholder={user.room} />
        <label htmlFor='complaint_type'>Complaint subject</label>
        <select name='complaint_type' id='complaint_type' ref={typeSelect}>
          <option value='room'>Room</option>
          <option value='washroom'>Washroom</option>
          <option value='cleaning'>Cleaning</option>
          <option value='laundry'>Laundry</option>
          <option value='gym'>Gym</option>
          <option value='other'>Other</option>
        </select>
        <label htmlFor='description'>Description (10-300 characters)</label>
        <textarea id='description' name='description' maxLength={300} minLength={10}></textarea>
        <label htmlFor='priority'>Priority</label>
        <select name='priority' id='priority' ref={prioritySelect}>
          <option value='low'>Low</option>
          <option value='medium'>Medium</option>
          <option value='high'>High</option>
        </select>
        <button type='submit' className='complaint-submit-btn'>Submit</button>
      </form>
    </div>
  );
}

export default MakeComplaint;