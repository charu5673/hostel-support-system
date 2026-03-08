import '../../index.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../contexts/useAlert"
import { Constants } from '../../data/Constants'
import BackButton from '../../components/BackButton'

function CheckRequest({ handleBack }) {

  const { showAlert } = useAlert()
  const API = Constants['API']

  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const loadRequests = async () => {
      try {

        const res = await fetch(`${API}/get-user-requests`, {
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

  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter(r => r.status === filter)

  return (
    <div className='check-request-outer'>

      <div className='check-request-top-row'>
        <h1>Request Status</h1>
        <BackButton handleBack={handleBack} />
      </div>

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
                    <h3>{l.day} - {l.meal_time}</h3>
                    <span className={`status-badge status-${l.status}`}>
                      {l.status}
                    </span>
                  </div>

                  <p className='request-description'>
                    {l.reason}
                  </p>

                  <div className='request-meta'>
                    <span className='request-meta-date'>
                      {new Date(l.created_at || l.applied_date).toLocaleDateString()}
                    </span>
                  </div>

                </div>
              ))
            )}

          </div>
        </>
      )}

    </div>
  )
}

export default CheckRequest;