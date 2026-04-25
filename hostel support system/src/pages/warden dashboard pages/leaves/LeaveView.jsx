import './leave.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useUpdate } from '../../../contexts/update/useUpdate'

function LeaveView() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showUpdate } = useUpdate()

  const [leaves, setLeaves] = useState([])
  const [filter, setFilter] = useState("all")

  const msg = {
    approved: 'Approve this leave?',
    rejected: 'Reject this leave?',
  }

  const action = {
    approved: 'Approve',
    rejected: 'Reject',
  }

  useEffect(() => {
    const loadLeaves = async () => {
      try {

        const res = await loadingFetch(`${API}/get-leaves`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch leaves!", "error")
          return
        }

        const data = await res.json()
        setLeaves(data)

      } catch {
        showAlert("Failed to load leaves!", "error")
      }
    }

    loadLeaves()
  }, [])

  const updateLeave = async (id, status) => {

    const confirmation = await showUpdate(msg[status], action[status])
    if (!confirmation.update) return

    const note = confirmation.note;
    const table = "leaves";

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

      if (!res.ok) {
        showAlert("Could not update leave status!", "error")
        return
      }

      setLeaves(prev =>
        prev.map(leave =>
          leave.id === id ? { ...leave, status: status, note: note } : leave
        )
      )

      showAlert("Leave status updated!", "success")

    } catch {
      showAlert("Failed to update leave status!", "error")
    }
  }

  const filteredLeaves =
    filter === "all"
      ? leaves
      : leaves.filter(leave => leave.status === filter)

  return (
    <div className='view-leaves-outer'>

      <h1>Leave Applications</h1>

      {leaves.length === 0 ? (
        <h2>No leave applications!</h2>
      ) : (
        <>
          <div className='leave-filter-row'>

            <button
              className={filter === "all" ? "active-filter" : ""}
              onClick={() => setFilter("all")}
            >
              All
            </button>

            <button
              className={filter === "pending" ? "active-filter" : ""}
              onClick={() => setFilter("pending")}
            >
              Pending
            </button>

            <button
              className={filter === "approved" ? "active-filter" : ""}
              onClick={() => setFilter("approved")}
            >
              Approved
            </button>

            <button
              className={filter === "rejected" ? "active-filter" : ""}
              onClick={() => setFilter("rejected")}
            >
              Rejected
            </button>

          </div>

          <div className='leaves-list'>

            {filteredLeaves.length === 0 ? (
              <p>No leaves in this category.</p>
            ) : (
              filteredLeaves.map((leave) => (
                <div className='leave-card' key={leave.id}>

                  <div className='leave-header'>
                    <div className='leave-header-left'>
                      <h3>{leave.name} (Room {leave.room})</h3>
                      <p className='leave-dates'>
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='leave-header-right'>
                      <span className={`status-badge status-${leave.status}`}>
                        {leave.status}
                      </span>
                      <span className='leave-date'>
                        {new Date(leave.applied_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className='leave-description'>
                    {leave.description}
                  </p>

                  {leave.note && (
                    <div className='leave-note'>
                      <strong>Note:</strong> {leave.note}
                    </div>
                  )}

                  {leave.status === "pending" && (
                    <div className='leave-actions'>
                      <button onClick={() => updateLeave(leave.id, "approved")}>Approve</button>
                      <button onClick={() => updateLeave(leave.id, "rejected")}>Reject</button>
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

export default LeaveView