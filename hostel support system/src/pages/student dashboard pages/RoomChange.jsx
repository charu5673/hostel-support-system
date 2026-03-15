import '../../index.css';
import { Constants } from '../../data/Constants';
import { useAlert } from '../../contexts/useAlert';
import BackButton from '../../components/BackButton';

function RoomChange({ user, handleBack }) {

  const { showAlert } = useAlert();

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const roll_no = e.target.roll.value;
    const reason = e.target.reason.value;
    const room = e.target.room.value;
    const new_room = e.target.new_room.value;
  
    const res = await fetch(`${Constants.API}/room-change-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ roll_no, reason, room, new_room }),
    });
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
  };

  return (
    <div className="room-change-outer">
      <form className='room-change-form' onSubmit={handleSubmit}>
        <div className='room-change-top-row'>
          <h2>Request for room change</h2>
          <BackButton handleBack={handleBack} />
        </div>
        <label htmlFor='roll'>Roll No.</label>
        <input disabled id="roll" name="roll" value={user.roll_no} placeholder={user.roll_no} />
        <label htmlFor='room'>Current room</label>
        <input disabled id='room' name='room' value={user.room} placeholder={user.room} />
        <label htmlFor='room'>{'New room (Optional)'}</label>
        <input id='new_room' name='new_room' type='number' />
        <label htmlFor='reason'>Reason (10-300 characters)</label>
        <textarea id='reason' name='reason' maxLength={300} minLength={10}></textarea>
        <button type='submit' className='room-change-submit-btn'>Submit</button>
      </form>
    </div>
  );
}

export default RoomChange;