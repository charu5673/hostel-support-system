import './room-change.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useUpdate } from '../../../contexts/update/useUpdate'

function RoomChangeView() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showUpdate } = useUpdate()

  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState("all")

  const msg = {
    approved: 'Approve this room change request?',
    rejected: 'Reject this room change request?',
  }

  const action = {
    approved: 'Approve',
    rejected: 'Reject',
  }

  useEffect(() => {
    const loadRequests = async () => {
      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_ROOM_CHANGE_REQUESTS}`, {
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

  const updateRequest = async (id, status, newRoom = null) => {

    const confirmation = await showUpdate(msg[status], action[status], newRoom, "room_change")
    if (!confirmation.update) return

    const note = confirmation.note
    newRoom = confirmation.newRoom

    if(!newRoom && status == "approved") {
      showAlert("New room is required!", "error")
      return;
    }

    try {

        const res = await loadingFetch(
          `${API}${Constants.ROUTES.UPDATE_ROOM_CHANGE_STATUS}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: newRoom ? JSON.stringify({ id, status, note, newRoom}) : JSON.stringify({ id, status, note }),
          }
        )

      if (!res.ok) {
        showAlert("Could not update request status!", "error")
        return
      }

      setRequests(prev =>
        prev.map(request =>
          request.id === id ? { ...request, status: status, note: confirmation.note, new_room: newRoom || request.new_room } : request
        )
      )

      showAlert("Request status updated!", "success")

    } catch {
      showAlert("Failed to update request status!", "error")
    }
  }

  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter(request => request.status === filter)

  return (
    <div className='view-requests-outer'>

      <h1>Room Change Requests</h1>

      {requests.length === 0 ? (
        <h2>No room change requests!</h2>
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
              filteredRequests.map((request) => (
                <div className='request-card' key={request.id}>

                  <div className='request-header'>
                    <div className='request-header-left'>
                      <h3>{request.name} (Room {request.room})</h3>
                      <p className='request-current-room'>{ request.status === 'approved' ? "Old room:" : "Current room:"} {request.current_room}</p>
                    </div>
                    <div className='request-header-right'>
                      <span className={`status-badge status-${request.status}`}>
                        {request.status}
                      </span>
                      <span className='request-date'>
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {
                    request.new_room != '' && request.new_room && request.status != 'rejected' ?
                      <p>{request.status === "pending" ? "Requested:" : "Assigned:"} Room {request.new_room}</p> :
                      null
                  }

                  <p className='request-description'>
                    {request.reason}
                  </p>

                  {request.note && (
                    <div className='request-note'>
                      <strong>Note:</strong> {request.note}
                    </div>
                  )}

                  {request.status === "pending" && (
                    <div className='request-actions'>
                      <button onClick={() => updateRequest(request.id, "approved", request.new_room)}>Approve</button>
                      <button onClick={() => updateRequest(request.id, "rejected")}>Reject</button>
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

export default RoomChangeView