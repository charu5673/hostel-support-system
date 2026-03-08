import { useState, useEffect } from "react"
import { Constants } from "../data/Constants"
import { useAlert } from "../contexts/useAlert"

export default function DashboardDefault({ user }) {

  const [announcements, setAnnouncements] = useState([])
  const { showAlert } = useAlert()

  useEffect(() => {

    const load = async () => {

      try {

        const res = await fetch(`${Constants['API']}/announcements`, {
          credentials: "include"
        })

        if (!res.ok) {
          setTimeout(() => {
            showAlert("Could not fetch announcements", "error")
          }, 0)
          return
        }

        const data = await res.json()

        const priorityOrder = {
          high: 1,
          medium: 2,
          low: 3
        }

        const sorted = data.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        )

        setAnnouncements(sorted)

      } catch {
        setTimeout(() => {
          showAlert("Failed to load announcements", "error")
        }, 0)
      }

    }

    load()

  }, [])

  return (
    <div className="default-dashboard-outer">

      {user && (
        <div className="dashboard-card">

          <h2>{user.name}</h2>

          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> <span style={{textTransform: "capitalize"}}>{user.role}</span> </p>

          {user.role === "student" && (
            <>
              <p><strong>Room:</strong> {user.room}</p>
              <p><strong>Roll No:</strong> {user.roll_no}</p>
            </>
          )}

        </div>
      )}

      <div className="dashboard-card">

        <h2>Announcements</h2>

        <div className="announcements-outer">
        {announcements.length === 0 ? (
          <p>No announcements available.</p>
        ) : (
          announcements.map((a) => (

            <div key={a.id} className="dashboard-announcement">

              <div className="header-row">

                <h4>{a.title}</h4>

                <span className={`announcement-priority ${a.priority}`}>
                  {a.priority}
                </span>

              </div>

              <p>{a.description}</p>

              <small>
                <span style={{textTransform: "capitalize"}}>{a.type}</span> • {new Date(a.datetime).toLocaleString()}
              </small>

            </div>

          ))
        )}
        </div>

      </div>

    </div>
  )
}