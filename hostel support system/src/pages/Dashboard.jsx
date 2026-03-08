import '../index.css';
import Sidebar from '../components/Sidebar';
import { studentOptions } from '../data/SidebarOptions';
import { DashboardPages } from '../data/DashboardPages';
import { useState, useEffect } from 'react';
import { useAlert } from "../contexts/useAlert"
import { useNavigate } from "react-router-dom"
import { Constants } from '../data/Constants';

function Dashboard() {

  const { showAlert } = useAlert()
  const navigate = useNavigate()
  const API = Constants['API']

  const [user, setUser] = useState(null)
  const [currentPageIndex, setCurrentPageIndex] = useState(Number(sessionStorage.getItem("dashboard-index")) || 0)

  useEffect(() => {
    const loadUser = async () => {
      try {

        const res = await fetch(`${API}/me`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Authentication failed", "error")
          setTimeout(() => {
            navigate('/login')
          }, 1000)
          return
        }

        const data = await res.json()
        setUser(data)

      } catch {
        showAlert("Failed to load user information", "error")
        setTimeout(() => {
            navigate('/login')
          }, 1000)
      }
    }

    loadUser()
  }, [])

  if (!user) return null

  const CurrentPage = DashboardPages[user.role ? user.role : 'student'][currentPageIndex]

  const handlePageChange = (i) => {
    sessionStorage.setItem("dashboard-index", i);
    setCurrentPageIndex(i);
  }

  return (
    <div className='dashboard-outer'>
      <Sidebar options={studentOptions} changePage={handlePageChange} />
      <CurrentPage user={user} handleBack={() => handlePageChange(0)} />
    </div>
  )
}

export default Dashboard