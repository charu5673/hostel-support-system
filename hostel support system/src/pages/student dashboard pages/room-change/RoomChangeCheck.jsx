import './room-change.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useConfirm } from '../../../contexts/confirm/useConfirm'

function RoomChangeCheck() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showConfirm } = useConfirm()

  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const loadRequests = async () => {
      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_USER_ROOM_CHANGE_REQUESTS}`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch requests!", "error")
          return
        }

        const data = await res.json()
        setRequests(data)

      } catch {
        showAlert("Failed to load requests!", "error")
      }
    }

    loadRequests()
  }, [])

  const cancelRequest = async (id) => {

    const confirmCancel = await showConfirm("Cancel this request?")
    if (!confirmCancel) return

    try {

      const res = await loadingFetch(`${API}${Constants.ROUTES.CANCEL_ROOM_CHANGE_REQUEST}/${id}`, {
        method: "DELETE",
        credentials: "include"
      })

      if (!res.ok) {
        showAlert("Could not cancel request!", "error")
        return
      }

      setRequests(prev => prev.filter(r => r.id !== id))

      showAlert("Request cancelled!", "success")

    } catch {
      showAlert("Failed to cancel request!", "error")
    }
  }

  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter(r => r.status === filter)

  return (
    <div className='check-request-outer'>

      <h1>Request Status</h1>

      {requests.length === 0 ? (
        <h2>No requests made!</h2>
      ) : (
        <>
          <div className='request-filter-row'>

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

          <div className='requests-list'>

            {filteredRequests.length === 0 ? (
              <p>No requests in this category.</p>
            ) : (
              filteredRequests.map((l) => (
                <div className='request-card' key={l.id}>

                  <div className='request-header'>
                    <div className='request-header-left'>
                      <h3>{l.name} (Room {l.room})</h3>
                      <p className='request-current-room'>Current room: {l.current_room}</p>
                    </div>
                    <div className='request-header-right'>
                      <span className={`status-badge status-${l.status}`}>
                        {l.status}
                      </span>
                      <span className='request-date'>
                        {new Date(l.created_at || l.applied_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {
                    l.new_room != '' && l.new_room && l.status != 'rejected' ?
                      <p>{l.status === "pending" ? "Requested:" : "Assigned:"} {l.new_room}</p> :
                      null
                  }
                  <p className='request-description'>
                    {l.reason}
                  </p>

                  {l.note && (
                    <div className='request-note'>
                      <strong>Note:</strong> {l.note}
                    </div>
                  )}

                  {l.status === "pending" && (
                    <button
                      className='cancel-request-button'
                      onClick={() => cancelRequest(l.id)}
                    >
                      Cancel Request
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

export default RoomChangeCheck
