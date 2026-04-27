import '../index.css';
import Sidebar from '../components/Sidebar';
import { studentOptions, wardenOptions, messOptions, adminOptions } from '../data/SidebarOptions';
import { DashboardPages } from '../data/DashboardPages';
import { useState, useEffect } from 'react';
import { useAlert } from "../contexts/alert/useAlert"
import { useLoading } from "../contexts/loading/useLoading"
import { useNavigate } from "react-router-dom"
import { Constants } from '../data/Constants';
import TopBar from '../components/TopBar';

function Dashboard() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const navigate = useNavigate()
  const API = Constants['API']

  const [user, setUser] = useState(null)
  const [currentPageIndex, setCurrentPageIndex] = useState(Number(sessionStorage.getItem("dashboard-index")) || 0)

  useEffect(() => {
    const loadUser = async () => {
      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.ME}`, {
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

  const options = {
    'student': studentOptions,
    'warden': wardenOptions,
    'mess': messOptions,
    'admin': adminOptions
  }

  return (
    <div className='dashboard-outer'>
      {
        user ?
        <Sidebar options={options[user.role]} changePage={handlePageChange} /> :
        null
      }
      <TopBar handleBack={() => handlePageChange(0)} />
      <CurrentPage user={user} />
    </div>
  )
}

export default Dashboard