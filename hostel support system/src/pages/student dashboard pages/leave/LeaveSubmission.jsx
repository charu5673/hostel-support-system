import './leave.css';
import { Constants } from '../../../data/Constants';
import { useAlert } from '../../../contexts/alert/useAlert';
import { useLoading } from '../../../contexts/loading/useLoading';

function LeaveSubmission({ user }) {

  const { showAlert } = useAlert();
  const { loadingFetch } = useLoading();

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const roll_no = e.target.roll.value;
    const description = e.target.description.value;
    const start_date = e.target.start_date.value;
    const end_date = e.target.end_date.value;

    if(new Date(start_date) > new Date(end_date) || new Date(end_date) < new Date().setHours(0, 0, 0, 0)) {
      showAlert("Invalid dates!", "error");
      return;
    }
  
    const res = await loadingFetch(`${Constants.API}${Constants.ROUTES.APPLY_FOR_LEAVE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ roll_no, description, start_date, end_date }),
    });
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
  };

  return (
    <div className="apply-leave-outer">
      <form className='leave-form' onSubmit={handleSubmit}>
        <h2>Apply for leave</h2>
        <label htmlFor='roll'>Roll No.</label>
        <input disabled id="roll" name="roll" value={user.roll_no} placeholder={user.roll_no} />
        <label htmlFor='description'>Description (10-300 characters)</label>
        <textarea id='description' name='description' maxLength={300} minLength={10}></textarea>
        <label htmlFor='start_date'>Start Date</label>
        <input id="start_date" name="start_date" type="date"></input>
        <label htmlFor='end_date'>End Date</label>
        <input id="end_date" name="end_date" type="date"></input>
        <button type='submit' className='leave-submit-btn'>Submit</button>
      </form>
    </div>
  );
}

export default LeaveSubmission;
