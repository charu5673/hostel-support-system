import './meal-request.css';
import { Constants } from '../../../data/Constants';
import { useAlert } from '../../../contexts/alert/useAlert';
import { useState } from 'react';
import { useLoading } from '../../../contexts/loading/useLoading';

function MealRequestSubmission({ user }) {

  const { showAlert } = useAlert();
  const { loadingFetch } = useLoading()

  const [reoccurringCheck, setReoccurringCheck] = useState(false);

  const handleCheckbox = () => {
    setReoccurringCheck(!reoccurringCheck);
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const roll_no = e.target.roll.value;
    const reason = e.target.reason.value;
    const meal_time = e.target.meal_time.value;
    const day = e.target.day ? e.target.day.value : null;
    const date = e.target.date ? e.target.date.value : null;
    const reoccurring = reoccurringCheck ? '1' : '0';
  
    const res = await loadingFetch(`${Constants.API}${Constants.ROUTES.REQUEST_MEAL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify( reoccurringCheck ? { roll_no, reason, day, meal_time, reoccurring } : { roll_no, reason, date, meal_time, reoccurring}),
    });
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");
  };

  return (
    <div className="meal-request-outer">
      <form className='request-form' onSubmit={handleSubmit}>
        <h2>Request for alternative meal</h2>
        <label htmlFor='roll'>Roll No.</label>
        <input disabled id="roll" name="roll" value={user.roll_no} placeholder={user.roll_no} />
        <label htmlFor='reason'>Reason (10-300 characters)</label>
        <textarea id='reason' name='reason' maxLength={300} minLength={10}></textarea>
        <label htmlFor='reoccurring'>Is this a reoccurring request</label>
        <input type='checkbox' id='reoccurring' name='reoccurring' onChange={handleCheckbox}/>
        <label htmlFor='meal_time'>Meal time</label>
        <select id='meal_time' name='meal_time'>
          <option value='breakfast'>Breakfast</option>
          <option value='lunch'>Lunch</option>
          <option value='snacks'>Snacks</option>
          <option value='dinner'>Dinner</option>
        </select>
        {
          reoccurringCheck ?
          <>
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
          </> :
          <>
          <label htmlFor='date'>Date</label>
          <input type='date' id='date' name='date' />
          </>
        }
        <button type='submit' className='meal-request-btn'>Submit</button>
      </form>
    </div>
  );
}

export default MealRequestSubmission;
