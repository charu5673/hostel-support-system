import './meal-request.css'
import { useState, useEffect } from 'react'
import { useAlert } from '../../../contexts/alert/useAlert'
import { useLoading } from '../../../contexts/loading/useLoading'
import { Constants } from '../../../data/Constants'
import { useUpdate } from '../../../contexts/update/useUpdate'

function MealRequestView() {
  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showUpdate } = useUpdate()

  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('all')

  const msg = {
    approved: 'Approve this meal request?',
    rejected: 'Reject this meal request?',
  }

  const action = {
    approved: 'Approve',
    rejected: 'Reject',
  }

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_MEAL_REQUESTS}`, {
          credentials: 'include',
        })

        if (!res.ok) {
          showAlert('Could not fetch meal requests!', 'error')
          return
        }

        const data = await res.json()
        setRequests(data)
      } catch {
        showAlert('Failed to load meal requests!', 'error')
      }
    }

    loadRequests()
  }, [API, loadingFetch, showAlert])

  const updateRequest = async (id, status) => {
    const confirmation = await showUpdate(msg[status], action[status])
    if (!confirmation.update) return

    const note = confirmation.note
    const table = 'meal_requests'

    try {
      const res = await loadingFetch(`${API}${Constants.ROUTES.UPDATE_STATUS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, status, note, table }),
      })

      const data = await res.json()
      showAlert(data.message, res.status === 200 ? 'success' : 'error')

      setRequests(prev =>
        prev.map(request =>
          request.id === id ? { ...request, status, note } : request
        )
      )
    } catch {
      showAlert('Failed to update meal request status!', 'error')
    }
  }

  const filteredRequests =
    filter === 'all'
      ? requests
      : requests.filter(request => request.status === filter)

  return (
    <div className='view-meal-requests-outer'>
      <h1>Meal Requests</h1>

      {requests.length === 0 ? (
        <h2>No meal requests submitted!</h2>
      ) : (
        <>
          <div className='meal-request-filter-row'>
            <button className={filter === 'all' ? 'active-filter' : ''} onClick={() => setFilter('all')}>
              All
            </button>
            <button className={filter === 'pending' ? 'active-filter' : ''} onClick={() => setFilter('pending')}>
              Pending
            </button>
            <button className={filter === 'approved' ? 'active-filter' : ''} onClick={() => setFilter('approved')}>
              Approved
            </button>
            <button className={filter === 'rejected' ? 'active-filter' : ''} onClick={() => setFilter('rejected')}>
              Rejected
            </button>
          </div>

          <div className='meal-requests-list'>
            {filteredRequests.length === 0 ? (
              <p>No requests in this category.</p>
            ) : (
              filteredRequests.map(request => (
                <div className='meal-request-card' key={request.id}>
                  <div className='meal-request-header'>
                    <div className='meal-request-header-left'>
                      <h3>{request.name} (Room {request.room})</h3>
                      <p className='meal-request-meta'>
                        {request.day ? request.day : request.date ? new Date(request.date).toLocaleDateString() : 'No date provided'} • {request.meal_time}
                      </p>
                    </div>
                    <div className='meal-request-header-right'>
                      <span className={`status-badge status-${request.status}`}>
                        {request.status}
                      </span>
                      <span className='meal-request-date'>
                        {new Date(request.created_at || request.applied_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className='meal-request-description'>
                    {request.reason}
                  </p>

                  {request.note && (
                    <div className='meal-request-note'>
                      <strong>Note:</strong> {request.note}
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className='meal-request-actions'>
                      <button onClick={() => updateRequest(request.id, 'approved')}>Approve</button>
                      <button onClick={() => updateRequest(request.id, 'rejected')}>Reject</button>
                    </div>
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

export default MealRequestView
