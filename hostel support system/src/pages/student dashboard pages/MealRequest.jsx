import '../../index.css';
import { Constants } from '../../data/Constants';
import { useAlert } from '../../contexts/useAlert';
import BackButton from '../../components/BackButton';

function MealRequest({ user, handleBack }) {

  const { showAlert } = useAlert();

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const roll_no = e.target.roll.value;
    const reason = e.target.reason.value;
    const meal_time = e.target.meal_time.value;
    const day = e.target.day.value;
  
    const res = await fetch(`${Constants.API}/meal-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ roll_no, reason, day, meal_time }),
    });
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
  };

  return (
    <div className="meal-request-outer">
      <form className='request-form' onSubmit={handleSubmit}>
        <div className='request-top-row'>
          <h2>Request for alternative meal</h2>
          <BackButton handleBack={handleBack} />
        </div>
        <label htmlFor='roll'>Roll No.</label>
        <input disabled id="roll" name="roll" value={user.roll_no} placeholder={user.roll_no} />
        <label htmlFor='reason'>Reason (10-300 characters)</label>
        <textarea id='reason' name='reason' maxLength={300} minLength={10}></textarea>
        <label htmlFor='meal_time'>Meal time</label>
        <select id='meal_time' name='meal_time'>
          <option value='breakfast'>Breakfast</option>
          <option value='lunch'>Lunch</option>
          <option value='snacks'>Snacks</option>
          <option value='dinner'>Dinner</option>
        </select>
        <label htmlFor='day'>Day</label>
        <select id='day' name='day'>
          {
            days.map((d) => {
              return (
                <option value={d}>{d}</option>
              )
            })
          }
        </select>
        <button type='submit' className='meal-request-btn'>Submit</button>
      </form>
    </div>
  );
}

export default MealRequest;