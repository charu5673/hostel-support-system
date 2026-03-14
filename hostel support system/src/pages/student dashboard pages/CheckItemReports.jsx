import '../../index.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../contexts/useAlert"
import { Constants } from '../../data/Constants'
import BackButton from '../../components/BackButton'
import { useConfirm } from '../../contexts/useConfirm'

function CheckItemReports({ handleBack }) {

  const { showAlert } = useAlert()
  const { showConfirm } = useConfirm()
  const API = Constants['API']

  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const loadReports = async () => {
      try {

        const res = await fetch(`${API}/get-user-item-reports`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch reports!", "error")
          return
        }

        const data = await res.json()
        setReports(data)

      } catch {
        showAlert("Failed to load reports!", "error")
      }
    }

    loadReports()
  }, [])

  const closeLostReport = async (id) => {

    const confirmClose = await showConfirm("Close this lost item report?")
    if (!confirmClose) return

    try {

      const res = await fetch(`${API}/close-lost-report/${id}`, {
        method: "PUT",
        credentials: "include"
      })

      if (!res.ok) {
        showAlert("Could not close report!", "error")
        return
      }

      setReports(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status: "closed" } : r
        )
      )

      showAlert("Report closed!", "success")

    } catch {
      showAlert("Failed to close report!", "error")
    }
  }

  const markClaimed = async (id) => {

    const confirmClaim = await showConfirm("Mark this item as claimed?")
    if (!confirmClaim) return

    try {

      const res = await fetch(`${API}/claim-found-item/${id}`, {
        method: "PUT",
        credentials: "include"
      })

      if (!res.ok) {
        showAlert("Could not update report!", "error")
        return
      }

      setReports(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status: "claimed" } : r
        )
      )

      showAlert("Item marked as claimed!", "success")

    } catch {
      showAlert("Failed to update report!", "error")
    }
  }

  const filteredReports =
    filter === "all"
      ? reports
      : reports.filter(r => r.status === filter)

  return (
    <div className='check-request-outer'>

      <div className='check-request-top-row'>
        <h1>Item Reports</h1>
        <BackButton handleBack={handleBack} />
      </div>

      {reports.length === 0 ? (
        <h2>No reports made!</h2>
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
              className={filter === "open" ? "active-filter" : ""}
              onClick={() => setFilter("open")}
            >
              Open
            </button>

            <button
              className={filter === "closed" ? "active-filter" : ""}
              onClick={() => setFilter("closed")}
            >
              Closed
            </button>

            <button
              className={filter === "claimed" ? "active-filter" : ""}
              onClick={() => setFilter("claimed")}
            >
              Claimed
            </button>

          </div>

          <div className='requests-list'>

            {filteredReports.length === 0 ? (
              <p>No reports in this category.</p>
            ) : (
              filteredReports.map((r) => (
                <div className='request-card' key={r.id}>

                  <div className='request-header'>
                    <h3>{r.item_name}</h3>
                    <span className={`status-badge status-${r.status}`}>
                      {r.status}
                    </span>
                  </div>

                  <p className='request-description'>
                    {r.description}
                  </p>

                  {r.image && (
                    <img src={r.image} className="report-image" />
                  )}

                  <div className='request-meta'>
                    <span className='request-meta-date'>
                      {new Date(r.date).toLocaleDateString()}
                    </span>
                  </div>

                  {r.report_type === "lost" && r.status === "open" && (
                    <button
                      className='cancel-request-button'
                      onClick={() => closeLostReport(r.id)}
                    >
                      Close Report
                    </button>
                  )}

                  {r.report_type === "found" && r.status === "open" && (
                    <button
                      className='cancel-request-button'
                      onClick={() => markClaimed(r.id)}
                    >
                      Mark as Claimed
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

export default CheckItemReports