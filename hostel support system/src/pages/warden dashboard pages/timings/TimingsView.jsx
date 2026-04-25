import './timings.css'
import { useCallback, useEffect, useState } from 'react'
import { Constants } from '../../../data/Constants'
import { useLoading } from '../../../contexts/loading/useLoading'
import { useConfirm } from '../../../contexts/confirm/useConfirm'
import { useAlert } from '../../../contexts/alert/useAlert'

const daysOfWeek = [
  'Monday','Tuesday','Wednesday',
  'Thursday','Friday','Saturday','Sunday'
]

const createEmptySchedule = () => {
  return daysOfWeek.reduce((schedule, day) => {
    schedule[day] = {
      start_time: '09:00',
      end_time: '17:00',
      is_closed: false
    }
    return schedule
  }, {})
}

function TimingsView() {
  const [facilityTimings, setFacilityTimings] = useState({})
  const [modalState, setModalState] = useState({
    open: false,
    type: null,
    facilityKey: '',
    facilityName: '',
    day: null,
    schedule: {}
  })
  const [formError, setFormError] = useState('')

  const { loadingFetch } = useLoading()
  const { showConfirm } = useConfirm()
  const { showAlert } = useAlert()

  const loadFacilityTimings = useCallback(async () => {
    try {
      const response = await loadingFetch(
        `${Constants.API}${Constants.ROUTES.GET_FACILITY_TIMINGS}`,
        { credentials: 'include' }
      )
      const result = await response.json()

      if (!response.ok || !result.success) {
        showAlert(result.message || 'Failed to load facility timings', 'error')
        return
      }

      const formattedTimings = {}
      result.data.forEach((row) => {
        if(row.start_time) {
          if(row.start_time.length == 7) row.start_time = '0' + row.start_time;
        }
        if(row.end_time) {
          if(row.end_time.length == 7) row.end_time = '0' + row.end_time;
        }
        if (!formattedTimings[row.facility]) formattedTimings[row.facility] = {}
        formattedTimings[row.facility][row.day] = row
      })

      setFacilityTimings(formattedTimings)
    } catch (error) {
      showAlert('Failed to load facility timings', 'error')
      console.log(error)
    }
  }, [loadingFetch, showAlert])

  useEffect(() => {
    loadFacilityTimings()
  }, [loadFacilityTimings])

  const openAddFacility = () => {
    setModalState({
      open: true,
      type: 'add',
      facilityKey: '',
      facilityName: '',
      day: null,
      schedule: createEmptySchedule()
    })
    setFormError('')
  }

  const openEditFacility = (facility) => {
    const currentSchedule = facilityTimings[facility] || {}
    const scheduleCopy = daysOfWeek.reduce((acc, day) => {
      const row = currentSchedule[day]
      acc[day] = row
        ? {
            start_time: row.start_time || '09:00',
            end_time: row.end_time || '17:00',
            is_closed: !!row.is_closed
          }
        : { start_time: '09:00', end_time: '17:00', is_closed: false }
      return acc
    }, {})

    setModalState({
      open: true,
      type: 'editFacility',
      facilityKey: facility,
      facilityName: facility,
      day: null,
      schedule: scheduleCopy
    })
    setFormError('')
  }

  const openEditCell = (facility, day) => {
    const row = facilityTimings[facility]?.[day] || {
      start_time: '09:00',
      end_time: '17:00',
      is_closed: false,
      id: null
    }

    setModalState({
      open: true,
      type: 'editCell',
      facilityKey: facility,
      facilityName: facility,
      day,
      schedule: {
        [day]: {
          id: row.id,
          start_time: row.start_time || '09:00',
          end_time: row.end_time || '17:00',
          is_closed: !!row.is_closed
        }
      }
    })
    setFormError('')
  }

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }))
    setFormError('')
  }

  const handleFacilityNameChange = (event) => {
    setModalState((prev) => ({ ...prev, facilityName: event.target.value }))
  }

  const handleDayCheckbox = (day) => {
    setModalState((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          is_closed: !prev.schedule[day].is_closed
        }
      }
    }))
  }

  const handleDayTimeChange = (day, field, value) => {
    setModalState((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value
        }
      }
    }))
  }

  const validateSchedule = (schedule) => {
    for (const day of Object.keys(schedule)) {
      const entry = schedule[day]
      if (!entry.is_closed) {
        if (!entry.start_time || !entry.end_time) {
          return `Please enter both start and end times for ${day} or mark it closed.`
        }
      }
    }
    return ''
  }

  const buildSchedulePayload = (schedule) => {
    return daysOfWeek.reduce((payload, day) => {
      const entry = schedule[day] || {}
      payload[day] = {
        start_time: entry.start_time || '09:00',
        end_time: entry.end_time || '17:00',
        is_closed: !!entry.is_closed
      }
      return payload
    }, {})
  }

  const callApi = async (route, options) => {
    const response = await loadingFetch(`${Constants.API}${route}`, options)
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Request failed')
    }
    return result
  }

  const handleSave = async () => {
    if (!modalState.facilityName.trim()) {
      setFormError('Facility name cannot be empty.')
      return
    }

    if (modalState.type === 'editCell') {
      const entry = modalState.schedule[modalState.day]
      if (!entry) return
      if (!entry.is_closed && (!entry.start_time || !entry.end_time)) {
        setFormError('Please enter both start and end times or mark the day closed.')
        return
      }
      if (!entry.id) {
        setFormError('Unable to update this timing because the row id is missing.')
        return
      }

      try {
        await callApi(Constants.ROUTES.UPDATE_FACILITY_TIMING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: entry.id,
            start_time: entry.start_time,
            end_time: entry.end_time,
            is_closed: entry.is_closed
          })
        })
        showAlert('Timing updated successfully', 'success')
        closeModal()
        loadFacilityTimings()
      } catch (error) {
        showAlert(error.message, 'error')
      }
      return
    }

    const scheduleError = validateSchedule(modalState.schedule)
    if (scheduleError) {
      setFormError(scheduleError)
      return
    }

    const payload = {
      facility: modalState.facilityName.trim(),
      schedule: buildSchedulePayload(modalState.schedule)
    }

    try {
      if (modalState.type === 'add') {
        await callApi(Constants.ROUTES.ADD_FACILITY_TIMING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
        showAlert('Facility added successfully', 'success')
      } else {
        await callApi(Constants.ROUTES.UPDATE_FACILITY_TIMINGS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            facilityKey: modalState.facilityKey,
            facilityName: modalState.facilityName.trim(),
            schedule: buildSchedulePayload(modalState.schedule)
          })
        })
        showAlert('Facility updated successfully', 'success')
      }

      closeModal()
      loadFacilityTimings()
    } catch (error) {
      showAlert(error.message, 'error')
    }
  }

  const handleRemoveFacility = async (facility) => {
    const confirmed = await showConfirm(`Remove facility ${facility} and all its timings?`)
    if (!confirmed) return

    try {
      const response = await loadingFetch(
        `${Constants.API}${Constants.ROUTES.REMOVE_FACILITY_TIMING}/${encodeURIComponent(facility)}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not remove facility')
      }
      showAlert('Facility removed successfully', 'success')
      loadFacilityTimings()
    } catch (error) {
      showAlert(error.message || 'Could not remove facility', 'error')
      console.log(error)
    }
  }

  const renderCellContent = (facilitySchedule, day) => {
    const dayTiming = facilitySchedule[day]
    if (!dayTiming) return '-'
    return dayTiming.is_closed ? 'Closed' : `${dayTiming.start_time.slice(0, 5)} - ${dayTiming.end_time.slice(0, 5)}`
  }

  return (
    <div className="check-timings-outer">
      <div className="timings-header-row">
        <h2>Facility Timings</h2>
        <button className="add-facility-btn" onClick={openAddFacility}>Add +</button>
      </div>

      <div className="timings-card">
        <table className="timings-table">
          <thead>
            <tr>
              <th>Facility</th>
              {daysOfWeek.map((day) => (
                <th key={day}>{day}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {Object.keys(facilityTimings).length === 0 && (
              <tr>
                <td colSpan={daysOfWeek.length + 2} className="empty-row">
                  No facility timings are available yet. Click Add to create one.
                </td>
              </tr>
            )}

            {Object.keys(facilityTimings).map((facility) => {
              const facilitySchedule = facilityTimings[facility]
              return (
                <tr key={facility}>
                  <td className="days facility-cell" onClick={() => openEditFacility(facility)}>{facility}</td>
                  {daysOfWeek.map((day) => (
                    <td
                      key={`${facility}-${day}`}
                      className="editable-cell"
                      onClick={() => openEditCell(facility, day)}
                    >
                      {renderCellContent(facilitySchedule, day)}
                    </td>
                  ))}
                  <td>
                    <button className="remove-facility-btn" onClick={() => handleRemoveFacility(facility)}>
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalState.open && (
        <div className="timings-modal-overlay" onClick={closeModal}>
          <div className="timings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timings-modal-header">
              <h3>
                {modalState.type === 'add' && 'Add new facility'}
                {modalState.type === 'editFacility' && 'Edit facility timings'}
                {modalState.type === 'editCell' && `Edit ${modalState.day} timing`}
              </h3>
            </div>

            <div className="timings-modal-body">
              <label>Facility name</label>
              <input
                type="text"
                value={modalState.facilityName}
                onChange={handleFacilityNameChange}
                disabled={modalState.type === 'editCell'}
                placeholder="Enter facility name"
              />

              {modalState.type !== 'editCell' ? (
                <div className="timings-day-grid">
                  {daysOfWeek.map((day) => {
                    const entry = modalState.schedule[day]
                    return (
                      <div className="timings-day-row" key={day}>
                        <div className="timings-day-label">{day}</div>
                        <label className="timings-closed-toggle">
                          <input
                            type="checkbox"
                            checked={entry.is_closed}
                            onChange={() => handleDayCheckbox(day)}
                          />
                          Closed
                        </label>
                        <div className="timings-time-inputs">
                          <input
                            type="time"
                            value={entry.start_time}
                            disabled={entry.is_closed}
                            onChange={(e) => handleDayTimeChange(day, 'start_time', e.target.value)}
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={entry.end_time}
                            disabled={entry.is_closed}
                            onChange={(e) => handleDayTimeChange(day, 'end_time', e.target.value)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="timings-day-row single-day-row">
                  <div className="timings-day-label">{modalState.day}</div>
                  <label className="timings-closed-toggle">
                    <input
                      type="checkbox"
                      checked={modalState.schedule[modalState.day].is_closed}
                      onChange={() => handleDayCheckbox(modalState.day)}
                    />
                    Closed
                  </label>
                  <div className="timings-time-inputs">
                    <input
                      type="time"
                      value={modalState.schedule[modalState.day].start_time}
                      disabled={modalState.schedule[modalState.day].is_closed}
                      onChange={(e) => handleDayTimeChange(modalState.day, 'start_time', e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={modalState.schedule[modalState.day].end_time}
                      disabled={modalState.schedule[modalState.day].is_closed}
                      onChange={(e) => handleDayTimeChange(modalState.day, 'end_time', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {formError && <p className="timings-modal-error">{formError}</p>}

              <div className="timings-modal-actions">
                <button className="timings-save-btn" onClick={handleSave}>Save</button>
                <button className="timings-cancel-btn" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimingsView
