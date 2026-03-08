import '../../index.css';
import { Constants } from '../../data/Constants';
import { useAlert } from '../../contexts/useAlert';
import BackButton from '../../components/BackButton';

function ShareFeedback({ user, handleBack }) {

  const { showAlert } = useAlert();

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const roll_no = e.target.roll.value;
    const description = e.target.description.value;
    const date = e.target.date.value;
    const meal_time = e.target.meal_time.value;

    if(new Date(date).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)) {
      showAlert("Cannot submit feedback for a future date!", "error");
      return;
    }
  
    const res = await fetch(`${Constants.API}/share-mess-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ roll_no, description, date, meal_time }),
    });
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
  };

  return (
    <div className="share-feedback-outer">
      <form className='feedback-form' onSubmit={handleSubmit}>
        <div className='feedback-top-row'>
          <h2>Share mess feedback</h2>
          <BackButton handleBack={handleBack} />
        </div>
        <label htmlFor='roll'>Roll No.</label>
        <input disabled id="roll" name="roll" value={user.roll_no} placeholder={user.roll_no} />
        <label htmlFor='description'>Description (10-300 characters)</label>
        <textarea id='description' name='description' maxLength={300} minLength={10}></textarea>
        <label htmlFor='date'>Date</label>
        <input id="date" name="date" type="date"></input>
        <label htmlFor='meal_time'>Meal time</label>
        <select id='meal_time' name='meal_time'>
          <option value='breakfast'>Breakfast</option>
          <option value='lunch'>Lunch</option>
          <option value='snacks'>Snacks</option>
          <option value='dinner'>Dinner</option>
        </select>
        <button type='submit' className='feedback-submit-btn'>Submit</button>
      </form>
    </div>
  );
}

export default ShareFeedback;