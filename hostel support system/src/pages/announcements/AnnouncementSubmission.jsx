import './announcements.css';
import { Constants } from '../../data/Constants';
import { useAlert } from '../../contexts/alert/useAlert';
import { useLoading } from '../../contexts/loading/useLoading';

function AnnouncementSubmission({ user }) {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading();

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const title = e.target.title.value;
    const description = e.target.description.value;
    const announcement_type = e.target.type.value;
    const priority = e.target.priority.value;
    const duration = e.target.duration.value;
  
    const res = await loadingFetch(`${Constants.API}${Constants.ROUTES.SUBMIT_ANNOUNCEMENT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ title, description, announcement_type, priority, duration }),
    });
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
  };

  const options = (
    <select id='type' name='type'>
      <option value='general'>General</option>
      <option value='facilities'>Facilities</option>
      <option value='mess'>Mess</option>
      <option value='laundry'>Laundry</option>
      <option value='timings'>Timings</option>
      <option value='other'>Other</option>
    </select>
  );

  const messOptions = (
    <select id='type' name='type'>
      <option value='mess'>Mess</option>
    </select>
  );

  return (
    <div className="submit-announcement-outer">
      <form className='announcement-form' onSubmit={handleSubmit}>
        <h2>Create an announcement</h2>
        <label htmlFor='title'>Title</label>
        <input id='title' name='title'></input>
        <label htmlFor='description'>Description (10-300 characters)</label>
        <textarea id='description' name='description' maxLength={300} minLength={10}></textarea>
        <label htmlFor='duration'>No. of days</label>
        <input id="duration" name="duration" type="number"></input>
        <label htmlFor='type'>Type</label>
        {
          user.role == 'mess' ?
          messOptions :
          options
        }
        <label htmlFor='priority'>Priority</label>
        <select name='priority' id='priority'>
          <option value='low'>Low</option>
          <option value='medium'>Medium</option>
          <option value='high'>High</option>
        </select>
        <button type='submit' className='announcement-submit-btn'>Submit</button>
      </form>
    </div>
  );
}

export default AnnouncementSubmission;
