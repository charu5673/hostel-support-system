import './settings.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../contexts/alert/useAlert"
import { useLoading } from "../../contexts/loading/useLoading"
import { Constants } from '../../data/Constants'

function Settings() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']

  const [settings, setSettings] = useState({
    menu: true,
    requests: true,
    announcements: {
      high: true,
      medium: true,
      low: false
    },
    facility_timings: false,
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_EMAIL_SETTINGS}`, {
          credentials: "include"
        })

        if (res.status != 200) {
          showAlert("Could not fetch settings!", "error");
          return;
        }

        const data = await res.json()
        setSettings(data)

      } catch(e) {
        console.log(e)
      }
    }

    loadSettings()
  }, [])

  const updateBackend = async (newSettings) => {
    try {

      const res = await loadingFetch(`${API}${Constants.ROUTES.UPDATE_EMAIL_SETTINGS}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newSettings),
      })

      if (!res.ok) {
        showAlert("Failed to update settings!", "error")
        return
      }

      showAlert("Settings updated!", "success")

    } catch {
      showAlert("Error updating settings!", "error")
    }
  }

  const toggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    updateBackend(updated)
  }

  const toggleAnnouncement = (level) => {
    const updated = {
      ...settings,
      announcements: {
        ...settings.announcements,
        [level]: !settings.announcements[level]
      }
    }

    setSettings(updated)
    updateBackend(updated)
  }

  return (
    <div className="settings-outer">

      <h1>Email Notification Settings</h1>

      <div className="settings-card">

        <h3>Menu</h3>
        <label>
          <input type="checkbox" checked={settings.menu} onChange={() => toggle("menu")} />
          Menu Changes
        </label>

      </div>

      <div className="settings-card">

        <h3>Requests</h3>
        <label>
          <input type="checkbox" checked={settings.requests} onChange={() => toggle("requests")} />
          Complaint / Leave / Room Change / Meal Request Updates
        </label>

      </div>

      <div className="settings-card">

        <h3>Announcements</h3>

        <label>
          <input type="checkbox" checked={settings.announcements.high} onChange={() => toggleAnnouncement("high")} />
          High Priority
        </label>

        <label>
          <input type="checkbox" checked={settings.announcements.medium} onChange={() => toggleAnnouncement("medium")} />
          Medium Priority
        </label>

        <label>
          <input type="checkbox" checked={settings.announcements.low} onChange={() => toggleAnnouncement("low")} />
          Low Priority
        </label>

      </div>

      <div className="settings-card">

        <h3>Facility timings</h3>
        <label>
          <input type="checkbox" checked={settings.facility_timings} onChange={() => toggle("facility_timings")} />
          Changes in timings of facilities
        </label>

      </div>

    </div>
  )
}

export default Settings