import '../analytics.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../../contexts/alert/useAlert"
import { useLoading } from "../../../../contexts/loading/useLoading"
import { Constants } from '../../../../data/Constants'

function Overview() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants.API

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const fetchData = async () => {

      setLoading(true)

      try {

        const res = await loadingFetch(
          `${API}${Constants.ROUTES.ANALYTICS_OVERVIEW}`,
          { credentials: "include" }
        )

        if (!res.ok) {
          showAlert("Could not fetch analytics data!", "error")
          return
        }

        const result = await res.json()
        setData(result)

      } catch {
        showAlert("Failed to load analytics!", "error")
      } finally {
        setLoading(false)
      }

    }

    fetchData()

  }, [API, loadingFetch, showAlert])

  if (loading) {
    return (
      <div className="analytics-overview">
        <h1>Dashboard Analytics</h1>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-overview">

      <h1>Dashboard Analytics</h1>

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-content">
            <h3>Total Students</h3>
            <p className="stat-value">{data?.total_students || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Active Complaints</h3>
            <p className="stat-value">{data?.active_complaints || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Pending Leaves</h3>
            <p className="stat-value">{data?.pending_leaves || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Pending Meal Requests</h3>
            <p className="stat-value">{data?.pending_meal_requests || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Pending Room Changes</h3>
            <p className="stat-value">{data?.pending_room_changes || 0}</p>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-content">
            <h3>Avg. Resolution Time</h3>
            <p className="stat-value">
              {data?.avg_resolution_hours || 0} <span className="stat-unit">hours</span>
            </p>
            <p className="stat-subtitle">Last 30 days</p>
          </div>
        </div>

      </div>

      <div className="overview-chart-section">
        <h2>Quick Overview</h2>

        <div className="overview-bars">

          <div className="bar-item">
            <span className="bar-label">Students</span>
            <div className="bar-container">
              <div className="bar-fill students-bar"
                style={{ width: `${Math.min((data?.total_students || 0) / 2, 100)}%` }}>
              </div>
            </div>
            <span className="bar-value">{data?.total_students || 0}</span>
          </div>

          <div className="bar-item">
            <span className="bar-label">Active Complaints</span>
            <div className="bar-container">
              <div className="bar-fill complaints-bar"
                style={{ width: `${Math.min((data?.active_complaints || 0) * 5, 100)}%` }}>
              </div>
            </div>
            <span className="bar-value">{data?.active_complaints || 0}</span>
          </div>

          <div className="bar-item">
            <span className="bar-label">Pending Leaves</span>
            <div className="bar-container">
              <div className="bar-fill leaves-bar"
                style={{ width: `${Math.min((data?.pending_leaves || 0) * 10, 100)}%` }}>
              </div>
            </div>
            <span className="bar-value">{data?.pending_leaves || 0}</span>
          </div>

          <div className="bar-item">
            <span className="bar-label">Pending Meals</span>
            <div className="bar-container">
              <div className="bar-fill meal-bar"
                style={{ width: `${Math.min((data?.pending_meal_requests || 0) * 10, 100)}%` }}>
              </div>
            </div>
            <span className="bar-value">{data?.pending_meal_requests || 0}</span>
          </div>

          <div className="bar-item">
            <span className="bar-label">Pending Room Changes</span>
            <div className="bar-container">
              <div className="bar-fill room-bar"
                style={{ width: `${Math.min((data?.pending_room_changes || 0) * 20, 100)}%` }}>
              </div>
            </div>
            <span className="bar-value">{data?.pending_room_changes || 0}</span>
          </div>

        </div>
      </div>

    </div>
  )
}

export default Overview