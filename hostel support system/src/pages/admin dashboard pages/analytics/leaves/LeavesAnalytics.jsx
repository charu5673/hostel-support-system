import '../analytics.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../../contexts/alert/useAlert"
import { useLoading } from "../../../../contexts/loading/useLoading"
import { Constants } from '../../../../data/Constants'

function LeavesAnalytics() {
  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants.API

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("month")
  const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 7))
  const [status, setStatus] = useState("all")
  const [open, setOpen] = useState(false)

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    const now = new Date()
    if (newPeriod === 'year') setDateValue(now.getFullYear().toString())
    else if (newPeriod === 'month') setDateValue(now.toISOString().slice(0, 7))
    else if (newPeriod === 'day') setDateValue(now.toISOString().slice(0, 10))
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await loadingFetch(
          `${API}${Constants.ROUTES.ANALYTICS_LEAVES}?period=${period}&date=${dateValue}&status=${status}`,
          { credentials: "include" }
        )

        if (!res.ok) {
          showAlert("Could not fetch leaves analytics!", "error")
          return
        }

        const result = await res.json()
        setData(result)
      } catch {
        showAlert("Failed to load leaves analytics!", "error")
      } finally {
        setLoading(false)
      }
    }

    if (dateValue) fetchData()
  }, [API, period, dateValue, status, loadingFetch, showAlert])

  if (loading && !data) {
    return (
      <div className="analytics-details">
        <h1>Leaves</h1>
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  const max = Math.max(...(data?.trend?.map(i => i.c) || [1]))

  return (
    <div className="analytics-details">
      <div className="details-header">
        <h1>Leaves</h1>

        <div className="period-controls">
          <div className="period-selector">
            <button onClick={() => handlePeriodChange("year")} className={period === "year" ? "active" : ""}>Year</button>
            <button onClick={() => handlePeriodChange("month")} className={period === "month" ? "active" : ""}>Month</button>
            <button onClick={() => handlePeriodChange("day")} className={period === "day" ? "active" : ""}>Day</button>
          </div>
          
          <div className="date-picker-container">
            {period === 'year' && <input type="number" value={dateValue} onChange={e => setDateValue(e.target.value)} className="date-input" />}
            {period === 'month' && <input type="month" value={dateValue} onChange={e => setDateValue(e.target.value)} className="date-input" />}
            {period === 'day' && <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} className="date-input" />}
          </div>
        </div>
      </div>

      <div className="stats-summary">
        <div className="summary-card"><h3>Total</h3><p>{data?.total || 0}</p></div>
        <div className="summary-card"><h3>Pending</h3><p>{data?.pending || 0}</p></div>
      </div>

      <div className="period-selector" style={{marginBottom: "20px"}}>
        {["all", "pending", "resolved", "rejected"].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={status === s ? "active" : ""}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="chart-section">
        <div className="chart-bars">
          {data?.trend?.length > 0 ? data.trend.map((i, idx) => (
            <div key={idx} className="chart-bar-wrapper">
              <div className="chart-bar" style={{ height: `${(i.c / max) * 100}%` }} data-value={i.c}></div>
              <span className="chart-label">{i.t}</span>
            </div>
          )) : <div className="no-data">No data for this period</div>}
        </div>
      </div>

      <div className="view-all-section">
        <button className="view-all-btn" onClick={() => setOpen(true)}>View All</button>
      </div>

      {open && (
        <div className="popup-overlay" onClick={() => setOpen(false)}>
          <div className="popup-content large" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h2>All Leaves</h2>
              <button className="popup-close" onClick={() => setOpen(false)}>X</button>
            </div>

            <div className="popup-body list">
              {data?.all?.map(c => (
                <div key={c.id} className="complaint-card">
                  <div className="complaint-top">
                    <b>{c.type}</b>
                    <span className={`status-badge status-${c.status}`}>{c.status}</span>
                  </div>
                  <p>{c.description}</p>
                  <div className="complaint-meta">
                    <span>{c.roll_no}</span>
                    <span>{new Date(c.applied_date).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {(!data?.all || data.all.length === 0) && <p>No records found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeavesAnalytics