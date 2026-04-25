import './leave.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useConfirm } from '../../../contexts/confirm/useConfirm'

function LeaveCheck() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showConfirm } = useConfirm()

  const [leaves, setLeaves] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const loadLeaves = async () => {
      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_USER_LEAVES}`, {
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

  const cancelLeave = async (id) => {

    const confirmCancel = await showConfirm("Cancel this leave?")
    if (!confirmCancel) return

    try {

      const res = await loadingFetch(`${API}${Constants.ROUTES.CANCEL_LEAVE}/${id}`, {
        method: "DELETE",
        credentials: "include"
      })

      if (!res.ok) {
        showAlert("Could not cancel leave!", "error")
        return
      }

      setLeaves(prev => prev.filter(l => l.id !== id))

      showAlert("Leave cancelled successfully!", "success")

    } catch {
      showAlert("Failed to cancel leave!", "error")
    }

  }

  const filteredLeaves =
    filter === "all"
      ? leaves
      : leaves.filter(l => l.status === filter)

  return (
    <div className='check-leave-outer'>

      <h1>Leave Status</h1>

      {leaves.length === 0 ? (
        <h2>No leaves applied for!</h2>
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
              filteredLeaves.map((l) => (
                <div className='leave-card' key={l.id}>

                  <div className='leave-header'>
                    <div className='leave-header-left'>
                      <h3>{l.name} (Room {l.room})</h3>
                      <p className='leave-dates'>
                        {new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='leave-header-right'>
                      <span className={`status-badge status-${l.status}`}>
                        {l.status}
                      </span>
                      <span className='leave-date'>
                        {new Date(l.created_at || l.applied_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className='leave-description'>
                    {l.description}
                  </p>

                  {l.note && (
                    <div className='leave-note'>
                      <strong>Note:</strong> {l.note}
                    </div>
                  )}

                  {l.status === "pending" && (
                    <button
                      className='cancel-leave-button'
                      onClick={() => cancelLeave(l.id)}
                    >
                      Cancel
                    </button>
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

export default LeaveCheck
