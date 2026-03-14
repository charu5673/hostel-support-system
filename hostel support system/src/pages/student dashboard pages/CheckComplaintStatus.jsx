import '../../index.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../contexts/useAlert"
import { Constants } from '../../data/Constants'
import BackButton from '../../components/BackButton'
import { useConfirm } from '../../contexts/useConfirm'

function CheckComplaints({ handleBack }) {

  const { showAlert } = useAlert()
  const API = Constants['API']
  const { showConfirm } = useConfirm()

  const [complaints, setComplaints] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const loadComplaints = async () => {
      try {

        const res = await fetch(`${API}/get-user-complaints`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch complaints!", "error")
          return
        }

        const data = await res.json()
        setComplaints(data)

      } catch {
        showAlert("Failed to load complaints!", "error")
      }
    }

    loadComplaints()
  }, [])

  const deleteComplaint = async (id) => {

    const confirmCancel = await showConfirm("Delete this complaint?")
    if (!confirmCancel) return

    try {

      const res = await fetch(`${API}/delete-complaint/${id}`, {
        method: "DELETE",
        credentials: "include"
      })

      if (!res.ok) {
        showAlert("Could not delete complaint!", "error")
        return
      }

      setComplaints(prev => prev.filter(c => c.id !== id))

      showAlert("Complaint deleted!", "success")

    } catch {
      showAlert("Failed to delete complaint!", "error")
    }
  }

  const filteredComplaints =
    filter === "all"
      ? complaints
      : complaints.filter(c => c.status === filter)

  return (
    <div className='check-complaints-outer'>

      <div className='check-complaints-top-row'>
        <h1>Complaint Status</h1>
        <BackButton handleBack={handleBack} />
      </div>

      {complaints.length === 0 ? (
        <h2>No complaints submitted!</h2>
      ) : (
        <>
          <div className='complaint-filter-row'>

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
              className={filter === "in_progress" ? "active-filter" : ""}
              onClick={() => setFilter("in_progress")}
            >
              In progress
            </button>

            <button
              className={filter === "resolved" ? "active-filter" : ""}
              onClick={() => setFilter("resolved")}
            >
              Resolved
            </button>

            <button
              className={filter === "rejected" ? "active-filter" : ""}
              onClick={() => setFilter("rejected")}
            >
              Rejected
            </button>

          </div>

          <div className='complaints-list'>

            {filteredComplaints.length === 0 ? (
              <p>No complaints in this category.</p>
            ) : (
              filteredComplaints.map((c) => (
                <div className='complaint-card' key={c.id}>

                  <div className='complaint-header'>
                    <h3>{c.type}</h3>
                    <span className={`status-badge status-${c.status}`}>
                      {c.status}
                    </span>
                  </div>

                  <p className='complaint-description'>
                    {c.description}
                  </p>

                  <div className='complaint-meta'>
                    <span className='complaint-meta-priority'>
                      Priority: {c.priority}
                    </span>

                    <span className='complaint-meta-date'>
                      {new Date(c.created_at || c.datetime).toLocaleDateString()}
                    </span>
                  </div>

                  {c.status === "pending" && (
                    <button
                      className='delete-complaint-button'
                      onClick={() => deleteComplaint(c.id)}
                    >
                      Delete
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

export default CheckComplaints