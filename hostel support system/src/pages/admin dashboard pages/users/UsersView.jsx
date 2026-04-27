import './users.css'
import { useState, useEffect, useCallback } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useConfirm } from '../../../contexts/confirm/useConfirm'

function UsersView() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showConfirm } = useConfirm()

  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState(null) // null = all, 'student', 'warden', 'mess', 'admin'
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Add user form state
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    user_type: 'student',
    room: '',
    roll_no: ''
  })

  const loadUsers = useCallback(async () => {
    try {
      const res = await loadingFetch(`${API}${Constants.ROUTES.GET_ALL_USERS}`, {
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
  }, [API, loadingFetch, showAlert])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const deleteUser = async (id) => {
    const confirmDelete = await showConfirm("Are you sure you want to delete this user?")
    if (!confirmDelete) return

    try {
      const res = await loadingFetch(`${API}${Constants.ROUTES.DELETE_USER}/${id}`, {
        method: "DELETE",
        credentials: "include"
      })

      if (!res.ok) {
        showAlert("Could not delete user!", "error")
        return
      }

      setUsers(prev => prev.filter(u => u.id !== id))
      showAlert("User deleted successfully!", "success")
    } catch {
      showAlert("Failed to delete user!", "error")
    }
  }

  const addUser = async () => {
    const { email, name, password, user_type, room, roll_no } = newUser

    if (!email || !password) {
      showAlert("Email and password are required!", "error")
      return
    }

    if (user_type === 'student' && (!room || !roll_no)) {
      showAlert("Room and roll number are required for students!", "error")
      return
    }

    try {
      const res = await loadingFetch(`${API}${Constants.ROUTES.ADD_USER}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          name: name || email,
          password,
          user_type,
          room: user_type === 'student' ? parseInt(room) : null,
          roll_no: user_type === 'student' ? parseInt(roll_no) : null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        showAlert(data.message || "Could not add user!", "error")
        return
      }

      showAlert("User added successfully!", "success")
      setShowAddPopup(false)
      setNewUser({
        email: '',
        name: '',
        password: '',
        user_type: 'student',
        room: '',
        roll_no: ''
      })
      loadUsers()
    } catch {
      showAlert("Failed to add user!", "error")
    }
  }

  const loadUserDetails = async (user) => {
    setSelectedUser(user)
    setDetailsLoading(true)
    setUserDetails(null)

    try {
      const details = {}

      // For students, load their complaints, leaves, meal requests, room changes, item reports, feedback
      if (user.user_type === 'student' && user.roll_no) {
        const rollNo = user.roll_no

        // Get complaints
        const complaintsRes = await loadingFetch(
          `${API}${Constants.ROUTES.GET_USER_COMPLAINTS_BY_ROLL}/${rollNo}`,
          { credentials: "include" }
        )
        if (complaintsRes.ok) {
          details.complaints = await complaintsRes.json()
        }

        // Get leaves
        const leavesRes = await loadingFetch(
          `${API}${Constants.ROUTES.GET_USER_LEAVES_BY_ROLL}/${rollNo}`,
          { credentials: "include" }
        )
        if (leavesRes.ok) {
          details.leaves = await leavesRes.json()
        }

        // Get meal requests
        const mealRes = await loadingFetch(
          `${API}${Constants.ROUTES.GET_USER_MEAL_REQUESTS_BY_ROLL}/${rollNo}`,
          { credentials: "include" }
        )
        if (mealRes.ok) {
          details.mealRequests = await mealRes.json()
        }

        // Get room change requests
        const roomRes = await loadingFetch(
          `${API}${Constants.ROUTES.GET_USER_ROOM_CHANGE_BY_ROLL}/${rollNo}`,
          { credentials: "include" }
        )
        if (roomRes.ok) {
          details.roomChanges = await roomRes.json()
        }

        // Get item reports
        const itemRes = await loadingFetch(
          `${API}${Constants.ROUTES.GET_USER_ITEM_REPORTS_BY_ROLL}/${rollNo}`,
          { credentials: "include" }
        )
        if (itemRes.ok) {
          details.itemReports = await itemRes.json()
        }

        // Get feedback
        const feedbackRes = await loadingFetch(
          `${API}${Constants.ROUTES.GET_USER_FEEDBACK_BY_ROLL}/${rollNo}`,
          { credentials: "include" }
        )
        if (feedbackRes.ok) {
          details.feedback = await feedbackRes.json()
        }
      }

      // For warden/mess, load their announcements
      if (user.user_type === 'warden' || user.user_type === 'mess') {
        const annRes = await loadingFetch(
          `${API}${Constants.ROUTES.GET_USER_ANNOUNCEMENTS_BY_ID}/${user.id}`,
          { credentials: "include" }
        )
        if (annRes.ok) {
          details.announcements = await annRes.json()
        }
      }

      setUserDetails(details)
    } catch {
      showAlert("Failed to load user details!", "error")
    } finally {
      setDetailsLoading(false)
    }
  }

  const filteredUsers = filter === null
    ? users
    : users.filter(u => u.user_type === filter)

  const userTypes = [
    { value: null, label: 'All' },
    { value: 'student', label: 'Student' },
    { value: 'warden', label: 'Warden' },
    { value: 'mess', label: 'Mess' },
    { value: 'admin', label: 'Admin' }
  ]

  return (
    <div className='view-users-outer'>
      <h1>Users</h1>

      <button
        className='add-user-btn'
        onClick={() => setShowAddPopup(true)}
      >
        Add
      </button>

      <div className='user-type-filter'>
        {userTypes.map(type => (
          <button
            key={type.value ?? 'all'}
            className={filter === type.value ? 'active-filter' : ''}
            onClick={() => setFilter(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      {users.length === 0 ? (
        <h2>No users found!</h2>
      ) : (
        <div className='users-list'>
          {filteredUsers.length === 0 ? (
            <p>No users in this category.</p>
          ) : (
            filteredUsers.map(user => (
              <div
                className='user-card'
                key={user.id}
                onClick={() => loadUserDetails(user)}
              >
                <div className='user-header'>
                  <div className='user-header-left'>
                    <h3>{user.name}</h3>
                    <p className='user-email'>{user.email}</p>
                  </div>
                  <div className='user-header-right'>
                    <span className={`user-type-badge ${user.user_type}`}>
                      {user.user_type}
                    </span>
                    <span className={`verified-badge ${user.is_verified ? 'verified' : 'unverified'}`}>
                      {user.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>

                {(user.room || user.roll_no) && (
                  <div className='user-details'>
                    {user.room && (
                      <span className='user-detail-item'>Room: {user.room}</span>
                    )}
                    {user.roll_no && (
                      <span className='user-detail-item'>Roll No: {user.roll_no}</span>
                    )}
                  </div>
                )}

                <div className='user-actions' onClick={(e) => e.stopPropagation()}>
                  <button
                    className='delete-user-btn'
                    onClick={() => deleteUser(user.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add User Popup */}
      {showAddPopup && (
        <div className='add-user-popup-overlay' onClick={() => setShowAddPopup(false)}>
          <div className='add-user-popup' onClick={(e) => e.stopPropagation()}>
            <h2>Add New User</h2>
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
            <select
              value={newUser.user_type}
              onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="warden">Warden</option>
              <option value="mess">Mess</option>
              <option value="admin">Admin</option>
            </select>
            {newUser.user_type === 'student' && (
              <>
                <input
                  type="number"
                  placeholder="Room Number"
                  value={newUser.room}
                  onChange={(e) => setNewUser({ ...newUser, room: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Roll Number"
                  value={newUser.roll_no}
                  onChange={(e) => setNewUser({ ...newUser, roll_no: e.target.value })}
                />
              </>
            )}
            <div className='add-user-popup-buttons'>
              <button onClick={() => setShowAddPopup(false)}>Cancel</button>
              <button onClick={addUser}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className='user-detail-overlay' onClick={() => setSelectedUser(null)}>
          <div className='user-detail-modal' onClick={(e) => e.stopPropagation()}>
            <h2>{selectedUser.name}</h2>

            <div className='user-detail-info'>
              <div>
                <label>Email</label>
                <span>{selectedUser.email}</span>
              </div>
              <div>
                <label>Type</label>
                <span className={`user-type-badge ${selectedUser.user_type}`}>
                  {selectedUser.user_type}
                </span>
              </div>
              {selectedUser.room && (
                <div>
                  <label>Room</label>
                  <span>{selectedUser.room}</span>
                </div>
              )}
              {selectedUser.roll_no && (
                <div>
                  <label>Roll No</label>
                  <span>{selectedUser.roll_no}</span>
                </div>
              )}
              <div>
                <label>Verified</label>
                <span>{selectedUser.is_verified ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <label>Created</label>
                <span>{new Date(selectedUser.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {detailsLoading ? (
              <p className="no-data-message">Loading details...</p>
            ) : userDetails ? (
              <>
                {/* Complaints for students */}
                {userDetails.complaints && userDetails.complaints.length > 0 && (
                  <>
                    <h3>Complaints ({userDetails.complaints.length})</h3>
                    <div className='detail-list'>
                      {userDetails.complaints.map(c => (
                        <div className='detail-item' key={c.id}>
                          <div className='detail-item-header'>
                            <h4>{c.type}</h4>
                            <span className={c.status}>{c.status}</span>
                          </div>
                          <p>{c.description}</p>
                          <p className='date'>Priority: {c.priority} | {new Date(c.datetime).toLocaleDateString()}</p>
                          {c.note && <p className='date'>Note: {c.note}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Leaves for students */}
                {userDetails.leaves && userDetails.leaves.length > 0 && (
                  <>
                    <h3>Leaves ({userDetails.leaves.length})</h3>
                    <div className='detail-list'>
                      {userDetails.leaves.map(l => (
                        <div className='detail-item' key={l.id}>
                          <div className='detail-item-header'>
                            <h4>{l.start_date} to {l.end_date}</h4>
                            <span className={l.status}>{l.status}</span>
                          </div>
                          <p>{l.description}</p>
                          <p className='date'>Applied: {new Date(l.applied_date).toLocaleDateString()}</p>
                          {l.note && <p className='date'>Note: {l.note}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Meal Requests for students */}
                {userDetails.mealRequests && userDetails.mealRequests.length > 0 && (
                  <>
                    <h3>Meal Requests ({userDetails.mealRequests.length})</h3>
                    <div className='detail-list'>
                      {userDetails.mealRequests.map(m => (
                        <div className='detail-item' key={m.id}>
                          <div className='detail-item-header'>
                            <h4>{m.day} - {m.meal_time}</h4>
                            <span className={m.status}>{m.status}</span>
                          </div>
                          <p>{m.reason}</p>
                          <p className='date'>Date: {m.date}</p>
                          {m.note && <p className='date'>Note: {m.note}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Room Changes for students */}
                {userDetails.roomChanges && userDetails.roomChanges.length > 0 && (
                  <>
                    <h3>Room Change Requests ({userDetails.roomChanges.length})</h3>
                    <div className='detail-list'>
                      {userDetails.roomChanges.map(r => (
                        <div className='detail-item' key={r.id}>
                          <div className='detail-item-header'>
                            <h4>Room {r.current_room} → {r.requested_room}</h4>
                            <span className={r.status}>{r.status}</span>
                          </div>
                          <p>{r.reason}</p>
                          <p className='date'>Applied: {new Date(r.applied_date).toLocaleDateString()}</p>
                          {r.note && <p className='date'>Note: {r.note}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Item Reports for students */}
                {userDetails.itemReports && userDetails.itemReports.length > 0 && (
                  <>
                    <h3>Lost & Found Reports ({userDetails.itemReports.length})</h3>
                    <div className='detail-list'>
                      {userDetails.itemReports.map(i => (
                        <div className='detail-item' key={i.id}>
                          <div className='detail-item-header'>
                            <h4>{i.item_name} ({i.report_type})</h4>
                            <span className={i.status}>{i.status}</span>
                          </div>
                          <p>{i.description}</p>
                          <p className='date'>{new Date(i.date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Feedback for students */}
                {userDetails.feedback && userDetails.feedback.length > 0 && (
                  <>
                    <h3>Mess Feedback ({userDetails.feedback.length})</h3>
                    <div className='detail-list'>
                      {userDetails.feedback.map(f => (
                        <div className='detail-item' key={f.id}>
                          <div className='detail-item-header'>
                            <h4>{f.meal_time}</h4>
                          </div>
                          <p>{f.description}</p>
                          <p className='date'>{new Date(f.date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Announcements for warden/mess */}
                {userDetails.announcements && userDetails.announcements.length > 0 && (
                  <>
                    <h3>Announcements ({userDetails.announcements.length})</h3>
                    <div className='detail-list'>
                      {userDetails.announcements.map(a => (
                        <div className='detail-item' key={a.id}>
                          <div className='detail-item-header'>
                            <h4>{a.title}</h4>
                            <span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                              {a.type}
                            </span>
                          </div>
                          <p>{a.description}</p>
                          <p className='date'>Priority: {a.priority} | {new Date(a.datetime).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* No data message */}
                {Object.keys(userDetails).every(key => !userDetails[key]?.length) && (
                  <p className="no-data-message">No records found.</p>
                )}
              </>
            ) : null}

            <button className='close-detail-btn' onClick={() => setSelectedUser(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersView