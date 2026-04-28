import '../index.css'
import { useState } from 'react'
import { useAlert } from "../contexts/alert/useAlert"
import { useLoading } from "../contexts/loading/useLoading"
import { useNavigate } from "react-router-dom"
import { Constants } from '../data/Constants'

function ForgotPassword() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const navigate = useNavigate()
  const API = Constants['API']

  const [email, setEmail] = useState("")

  const handleSubmit = async () => {

    if (!email) {
      showAlert("Email is required", "error")
      return
    }

    try {
      const res = await loadingFetch(`${API}${Constants.ROUTES.FORGOT_PASSWORD}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include"
      })

      const data = await res.json()

      if (!res.ok) {
        showAlert(data.message || "Failed to send reset email", "error")
        return
      }

      showAlert("Reset password email sent", "success")

    } catch {
      showAlert("Something went wrong", "error")
    }
  }

  return (
    <div className="login-page-outer">

      <div className="title">
        Reset
      </div>

      <div className="action-div">

        <div className="action-text">
          Forgot Password
        </div>

        <input
          type="email"
          id="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="login-btn" onClick={handleSubmit}>
          Send Reset Link
        </button>

        <div className="login-nav">
          Remembered your password?{" "}
          <span className="bold-text" onClick={() => navigate('/login')}>
            Login
          </span>
        </div>

      </div>

    </div>
  )
}

export default ForgotPassword