import './announcements.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../contexts/alert/useAlert"
import { useLoading } from "../../contexts/loading/useLoading"
import { Constants } from '../../data/Constants'
import { useConfirm } from '../../contexts/confirm/useConfirm'

function AnnouncementsCheck() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showConfirm } = useConfirm()

  const [announcements, setAnnouncements] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {

        const res = await loadingFetch(`${API}/get-user-announcements`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch announcements!", "error")
          return
        }

        const data = await res.json()
        setAnnouncements(data)

      } catch {
        showAlert("Failed to load announcements!", "error")
      }
    }

    loadAnnouncements()
  }, [])

  const deleteAnnouncement = async (id) => {

    const confirmDelete = await showConfirm("Delete this announcement?")
    if (!confirmDelete) return

    try {

      const res = await loadingFetch(`${API}/delete-announcement/${id}`, {
        method: "DELETE",
        credentials: "include"
      })

      if (!res.ok) {
        showAlert("Could not delete announcement!", "error")
        return
      }

      setAnnouncements(prev => prev.filter(a => a.id !== id))

      showAlert("Announcement deleted!", "success")

    } catch {
      showAlert("Failed to delete announcement!", "error")
    }
  }

  const filteredAnnouncements =
    filter === "all"
      ? announcements
      : announcements.filter(a => a.type === filter)

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high'
      case 'medium': return 'priority-medium'
      case 'low': return 'priority-low'
      default: return 'priority-low'
    }
  }

  return (
    <div className='check-announcements-outer'>

      <h1>My Announcements</h1>

      {announcements.length === 0 ? (
        <h2>No announcements posted yet!</h2>
      ) : (
        <>
          <div className='announcement-filter-row'>

            <button
              className={filter === "all" ? "active-filter" : ""}
              onClick={() => setFilter("all")}
            >
              All
            </button>

            <button
              className={filter === "general" ? "active-filter" : ""}
              onClick={() => setFilter("general")}
            >
              General
            </button>

            <button
              className={filter === "facilities" ? "active-filter" : ""}
              onClick={() => setFilter("facilities")}
            >
              Facilities
            </button>

            <button
              className={filter === "mess" ? "active-filter" : ""}
              onClick={() => setFilter("mess")}
            >
              Mess
            </button>

            <button
              className={filter === "laundry" ? "active-filter" : ""}
              onClick={() => setFilter("laundry")}
            >
              Laundry
            </button>

            <button
              className={filter === "timings" ? "active-filter" : ""}
              onClick={() => setFilter("timings")}
            >
              Timings
            </button>

            <button
              className={filter === "other" ? "active-filter" : ""}
              onClick={() => setFilter("other")}
            >
              Other
            </button>

          </div>

          <div className='announcements-list'>

            {filteredAnnouncements.length === 0 ? (
              <p>No announcements in this category.</p>
            ) : (
              filteredAnnouncements.map((a) => (
                <div className='announcement-card' key={a.id}>

                  <div className='announcement-header'>
                    <h3>{a.title}</h3>
                    <div className='announcement-header-right'>
                      <span className={`priority-badge ${getPriorityColor(a.priority)}`}>
                        {a.priority}
                      </span>
                      <span className='announcement-type'>
                        {a.type}
                      </span>
                      <span className='announcement-date'>
                        {new Date(a.datetime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className='announcement-description'>
                    {a.description}
                  </p>

                  <div className='announcement-meta'>
                    <span className='announcement-meta-duration'>
                      Duration: {a.duration} days
                    </span>
                    <button
                      className='delete-announcement-button'
                      onClick={() => deleteAnnouncement(a.id)}
                    >
                      Delete
                    </button>
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

export default AnnouncementsCheck
