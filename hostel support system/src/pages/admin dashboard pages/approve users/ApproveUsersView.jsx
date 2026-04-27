import './approve-users.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useConfirm } from '../../../contexts/confirm/useConfirm'

function ApproveUsersView() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const { showConfirm } = useConfirm()
  const API = Constants['API']

  const [users, setUsers] = useState([])

  useEffect(() => {
    const loadUsers = async () => {
      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_PENDING_USERS}`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch users!", "error")
          return
        }

        const data = await res.json()
        setUsers(data)

      } catch {
        showAlert("Failed to load users!", "error")
      }
    }

    loadUsers()
  }, [])

  const updateStatus = async (id, status, i) => {

    const confirm = await showConfirm(`${status === "approved" ? "Approve" : "Reject"} this user?`)
    if (!confirm) return

    try {

      const res = await loadingFetch(`${API}${Constants.ROUTES.UPDATE_USER_STATUS}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ user_id: id, status })
      })

      if (!res.ok) {
        showAlert("Could not update user!", "error")
        return
      }

      let newUsers = [...users]

      if (status === "approved" || status === "rejected") {
        newUsers.splice(i, 1)
      }

      setUsers(newUsers)

      showAlert(`User ${status}!`, "success")

    } catch {
      showAlert("Failed to update user!", "error")
    }
  }

  return (
    <div className='approve-users-outer'>

      <h1>User Approvals</h1>

      {users.length === 0 ? (
        <h2>No pending users!</h2>
      ) : (
        <div className='users-list'>

          {users.map((u, i) => (
            <div className='user-card' key={u.id}>

              <div className='user-header'>
                <div className='user-header-left'>
                  <h3>{u.name}</h3>
                  <p className='user-role'>{u.user_type}</p>
                  <p className='user-email'>{u.email}</p>
                </div>

                <div className='user-header-right'>
                  <span className={`status-badge status-${u.status}`}>
                    {u.status}
                  </span>
                  <span className='user-date'>
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className='user-actions'>
                <button onClick={() => updateStatus(u.id, "approved", i)}>
                  Approve
                </button>
                <button onClick={() => updateStatus(u.id, "rejected", i)}>
                  Reject
                </button>
              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  )
}

export default ApproveUsersView