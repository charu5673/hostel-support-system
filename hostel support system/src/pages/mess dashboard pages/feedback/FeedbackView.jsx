import './feedback.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'

function FeedbackView() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']

  const [list, setList] = useState([])
  const [flt, setFlt] = useState("all")
  const [date, setDate] = useState("")

  useEffect(() => {
    const load = async () => {
      try {

        const res = await loadingFetch(
          `${API}${Constants.ROUTES.GET_MESS_FEEDBACK}`,
          { credentials: "include" }
        )

        if (!res.ok) {
          showAlert("Could not fetch feedback!", "error")
          return
        }

        const rec = await res.json()
        console.log(data)
        setList(rec.data)

      } catch {
        showAlert("Failed to load feedback!", "error")
      }
    }

    load()
  }, [])

  const data = list.filter(i => {
    const mealMatch = flt === "all" || i.meal_time === flt
    const dateMatch = !date || new Date(i.date).toISOString().split("T")[0] === date
    return mealMatch && dateMatch
  })

  return (
    <div className='view-feedback-outer'>

      <h1>Mess Feedback</h1>

      {list.length === 0 ? (
        <h2>No feedback submitted!</h2>
      ) : (
        <>
          <div className='feedback-filter-row'>

            <button className={flt === "all" ? "active-filter" : ""} onClick={() => setFlt("all")}>All</button>
            <button className={flt === "breakfast" ? "active-filter" : ""} onClick={() => setFlt("breakfast")}>Breakfast</button>
            <button className={flt === "lunch" ? "active-filter" : ""} onClick={() => setFlt("lunch")}>Lunch</button>
            <button className={flt === "snacks" ? "active-filter" : ""} onClick={() => setFlt("snacks")}>Snacks</button>
            <button className={flt === "dinner" ? "active-filter" : ""} onClick={() => setFlt("dinner")}>Dinner</button>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

          </div>

          <div className='feedback-list'>

            {data.length === 0 ? (
              <p>No feedback for selected filters.</p>
            ) : (
              data.map(f => (
                <div className='feedback-card' key={f.id}>

                  <div className='feedback-header'>

                    <h3>Roll No: {f.roll_no}</h3>

                    <span className='feedback-date'>
                      {new Date(f.date).toLocaleDateString()}
                    </span>

                  </div>

                  <div className='feedback-meta'>
                    <span className='feedback-meal'>
                      {f.meal_time}
                    </span>
                  </div>

                  <p className='feedback-description'>
                    {f.description}
                  </p>

                </div>
              ))
            )}

          </div>
        </>
      )}

    </div>
  )
}

export default FeedbackView