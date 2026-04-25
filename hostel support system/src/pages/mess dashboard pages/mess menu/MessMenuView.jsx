import './mess-menu.css'
import { useState, useEffect, useCallback } from 'react'
import { Constants } from '../../../data/Constants'
import { useLoading } from '../../../contexts/loading/useLoading'
import { useAlert } from '../../../contexts/alert/useAlert'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const mealTimes = ['breakfast', 'lunch', 'snacks', 'dinner']
const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner'
}

function MessMenuView() {
  const [menu, setMenu] = useState({})
  const [modalState, setModalState] = useState({
    open: false,
    type: null,
    day: null,
    meal_time: null,
    values: {}
  })
  const [saving, setSaving] = useState(false)

  const { loadingFetch } = useLoading()
  const { showAlert } = useAlert()

  const loadMenu = useCallback(async () => {
    try {
      const res = await loadingFetch(`${Constants.API}${Constants.ROUTES.GET_MESS_MENU}`, {
        credentials: 'include'
      })
      const data = await res.json()

      if (!data.success) {
        showAlert(data.error || 'Could not load mess menu', 'error')
        return
      }

      const byDay = {}
      data.data.forEach((row) => {
        byDay[row.day] = row
      })
      setMenu(byDay)
    } catch {
      showAlert('Failed to load mess menu', 'error')
    }
  }, [loadingFetch, showAlert])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  const closeModal = () => {
    setModalState({
      open: false,
      type: null,
      day: null,
      meal_time: null,
      values: {}
    })
  }

  const openCell = (day, meal_time) => {
    setModalState({
      open: true,
      type: 'cell',
      day,
      meal_time,
      values: {
        value: menu[day]?.[meal_time] || ''
      }
    })
  }

  const openDay = (day) => {
    setModalState({
      open: true,
      type: 'day',
      day,
      meal_time: null,
      values: {
        breakfast: menu[day]?.breakfast || '',
        lunch: menu[day]?.lunch || '',
        snacks: menu[day]?.snacks || '',
        dinner: menu[day]?.dinner || ''
      }
    })
  }

  const openTime = (meal_time) => {
    const values = {}
    days.forEach((day) => {
      values[day] = menu[day]?.[meal_time] || ''
    })
    setModalState({
      open: true,
      type: 'time',
      day: null,
      meal_time,
      values
    })
  }

  const handleValueChange = (field, value) => {
    setModalState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    const { type, day, meal_time, values } = modalState
    const payload = {}
    let route = null

    if (type === 'cell') {
      route = Constants.ROUTES.UPDATE_MENU_ITEM
      payload.day = day
      payload.meal_time = meal_time
      payload.value = values.value
    } else if (type === 'day') {
      route = Constants.ROUTES.UPDATE_DAY_MENU
      payload.day = day
      payload.breakfast = values.breakfast
      payload.lunch = values.lunch
      payload.snacks = values.snacks
      payload.dinner = values.dinner
    } else if (type === 'time') {
      route = Constants.ROUTES.UPDATE_TIME_MENU
      payload.meal_time = meal_time
      payload.menu = values
    }

    if (!route) {
      showAlert('Unable to save changes', 'error')
      return
    }

    setSaving(true)

    try {
      const res = await loadingFetch(`${Constants.API}${route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        showAlert(data.message || data.error || 'Could not save menu update', 'error')
        return
      }

      showAlert(data.message || 'Menu updated successfully', 'success')

      setMenu((prev) => {
        const next = { ...prev }

        if (type === 'cell') {
          const row = { ...next[day] }
          row[meal_time] = values.value
          next[day] = row
        }

        if (type === 'day') {
          const row = { ...next[day] }
          next[day] = {
            ...row,
            breakfast: values.breakfast,
            lunch: values.lunch,
            snacks: values.snacks,
            dinner: values.dinner
          }
        }

        if (type === 'time') {
          days.forEach((currentDay) => {
            const row = { ...next[currentDay] }
            row[meal_time] = values[currentDay] || ''
            next[currentDay] = row
          })
        }

        return next
      })

      closeModal()
    } catch {
      showAlert('Failed to save menu update', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='check-mess-menu-outer'>
      <div className='menu-header-row'>
        <div>
          <h2>Mess Menu</h2>
          <p className='menu-subtitle'>Click a day to edit that row, a meal heading to edit that timing, or a cell to edit one item.</p>
        </div>
      </div>

      <div className='menu-card'>
        <table className='mess-table'>
          <thead>
            <tr>
              <th>Day</th>
              {mealTimes.map((meal) => (
                <th key={meal} className='editable-column' onClick={() => openTime(meal)}>
                  {mealLabels[meal]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const row = menu[day] || {}
              return (
                <tr key={day}>
                  <td className='days editable-row' onClick={() => openDay(day)}>{day}</td>
                  {mealTimes.map((meal) => (
                    <td key={meal} className='editable-cell' onClick={() => openCell(day, meal)}>
                      {(row[meal] || '-').split(', ').map((item, index) => (
                        <div key={index}>{item || '-'}</div>
                      ))}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalState.open && (
        <div className='menu-modal-overlay' onClick={closeModal}>
          <div className='menu-modal' onClick={(e) => e.stopPropagation()}>
            <div className='menu-modal-header'>
              <h3>
                {modalState.type === 'cell' && `Edit ${mealLabels[modalState.meal_time]} for ${modalState.day}`}
                {modalState.type === 'day' && `Edit menu for ${modalState.day}`}
                {modalState.type === 'time' && `Edit ${mealLabels[modalState.meal_time]} for all days`}
              </h3>
            </div>

            <div className='menu-modal-body'>
              {modalState.type === 'cell' && (
                <>
                  <label>{mealLabels[modalState.meal_time]}</label>
                  <textarea
                    value={modalState.values.value}
                    onChange={(e) => handleValueChange('value', e.target.value)}
                    placeholder='Enter menu items separated by commas'
                  />
                </>
              )}

              {modalState.type === 'day' && (
                <div className='menu-field-grid'>
                  {mealTimes.map((meal) => (
                    <div className='menu-field-row' key={meal}>
                      <label>{mealLabels[meal]}</label>
                      <textarea
                        value={modalState.values[meal]}
                        onChange={(e) => handleValueChange(meal, e.target.value)}
                        placeholder={`Enter ${mealLabels[meal]} items separated by commas`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {modalState.type === 'time' && (
                <div className='menu-field-grid'>
                  {days.map((day) => (
                    <div className='menu-field-row' key={day}>
                      <label>{day}</label>
                      <textarea
                        value={modalState.values[day]}
                        onChange={(e) => handleValueChange(day, e.target.value)}
                        placeholder={`Enter ${mealLabels[modalState.meal_time]} for ${day}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className='menu-modal-actions'>
                <button className='menu-save-btn' onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className='menu-cancel-btn' onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessMenuView
