import './complaint.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useUpdate } from '../../../contexts/update/useUpdate'

function ComplaintView() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showUpdate } = useUpdate()

  const [list, setList] = useState([])
  const [flt, setFlt] = useState("all")

  const msg = {
    resolved: 'Close this complaint?',
    rejected: 'Reject this complaint?',
    in_progress: 'Mark complaint as in progress?'
  }

  const action = {
    resolved: 'Resolved',
    rejected: 'Reject',
    in_progress: 'Update'
  }

  useEffect(() => {
    const load = async () => {
      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_COMPLAINTS}`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch complaints!", "error")
          return
        }

        const data = await res.json()
        setList(data)

      } catch {
        showAlert("Failed to load complaints!", "error")
      }
    }

    load()
  }, [])

  const upd = async (id, status) => {

    const conf = await showUpdate(msg[status], action[status])
    if (!conf.update) return

    const note = conf.note;
    const table = "complaints";

    try {

      const res = await loadingFetch(
        `${API}${Constants.ROUTES.UPDATE_STATUS}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ id, status, note, table }),
        }
      )
  
    const data = await res.json();
    showAlert(data.message, res.status == 200 ? "success" : "error");

    setList(prev =>
      prev.map(i =>
        i.id === id ? { ...i, status: status, note: note } : i
      )
    )

    } catch {
      showAlert("Failed to update status!", "error")
    }
  }

  const data =
    flt === "all"
      ? list
      : list.filter(i => i.status === flt)

  return (
    <div className='view-complaints-outer'>

      <h1>Complaints</h1>

      {list.length === 0 ? (
        <h2>No complaints submitted!</h2>
      ) : (
        <>
          <div className='complaint-filter-row'>

            <button className={flt === "all" ? "active-filter" : ""} onClick={() => setFlt("all")}>All</button>
            <button className={flt === "pending" ? "active-filter" : ""} onClick={() => setFlt("pending")}>Pending</button>
            <button className={flt === "in_progress" ? "active-filter" : ""} onClick={() => setFlt("in_progress")}>In progress</button>
            <button className={flt === "resolved" ? "active-filter" : ""} onClick={() => setFlt("resolved")}>Resolved</button>
            <button className={flt === "rejected" ? "active-filter" : ""} onClick={() => setFlt("rejected")}>Rejected</button>

          </div>

          <div className='complaints-list'>

            {data.length === 0 ? (
              <p>No complaints in this category.</p>
            ) : (
              data.map(c => (
                <div className='complaint-card' key={c.id}>

                  <div className='complaint-header'>
                    <div className='complaint-header-left'>
                      <h3>{c.name} (Room {c.room})</h3>
                      <p className='complaint-type'>{c.type}</p>
                    </div>
                    <div className='complaint-header-right'>
                      <span className={`status-badge status-${c.status}`}>
                        {c.status}
                      </span>
                      <span className='complaint-date'>
                        {new Date(c.created_at || c.datetime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className='complaint-description'>
                    {c.description}
                  </p>

                  <div className='complaint-meta'>
                    <span className='complaint-meta-priority'>
                      Priority: {c.priority}
                    </span>
                  </div>

                  {c.note && (
                    <div className='complaint-note'>
                      <strong>Note:</strong> {c.note}
                    </div>
                  )}

                  {c.status != "resolved" && c.status != "rejected" && (
                    <div className='complaint-actions'>
                      <button onClick={() => upd(c.id, "resolved")}>Resolved</button>
                      {c.status != "in_progress" && <button onClick={() => upd(c.id, "in_progress")}>In Progress</button>}
                      <button onClick={() => upd(c.id, "rejected")}>Reject</button>
                    </div>
                  )}

                </div>
              ))
            )}

          </div>
        </>
      )}

    </div>
  )
}

export default ComplaintView