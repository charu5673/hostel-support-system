import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../index.css'
import { useLoading } from '../contexts/loading/useLoading'
import { useAlert } from "../contexts/alert/useAlert"
import { Constants } from '../data/Constants'

function ResetPassword() {

  const { token } = useParams()
  const navigate = useNavigate()

  const { loadingFetch } = useLoading()
  const { showAlert } = useAlert()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [invalid, setInvalid] = useState(false)

  const handleSubmit = async () => {

    if (!password || !confirm) {
      showAlert("All fields required", "error")
      return
    }

    if (password !== confirm) {
      showAlert("Passwords do not match", "error")
      return
    }

    try {
      const res = await loadingFetch(
        `${Constants.API}${Constants.ROUTES.RESET_PASSWORD}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password })
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setInvalid(true)
        showAlert(data.message || "Reset failed", "error")
        return
      }

      showAlert("Password reset successful", "success")

      setTimeout(() => {
        navigate('/login')
      }, 1500)

    } catch {
      setInvalid(true)
      showAlert("Reset link expired or invalid", "error")
    }
  }

  if (invalid) {
    return (
      <div className="verification-page-outer">
        <p className="verification-text">
          Reset link expired or invalid.
        </p>
      </div>
    )
  }

  return (
    <div className="login-page-outer">

      <div className="title">
        Reset
      </div>

      <div className="action-div">

        <div className="action-text">
          Set New Password
        </div>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button className="login-btn" onClick={handleSubmit}>
          Reset Password
        </button>

      </div>

    </div>
  )
}

export default ResetPassword