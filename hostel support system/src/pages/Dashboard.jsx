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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const handlePageChangeWithClose = (i) => {
    handlePageChange(i)
    closeSidebar()
  }

  return (
    <div className='dashboard-outer'>
      {/* Sidebar toggle button for mobile */}
      <button className='sidebar-toggle' onClick={toggleSidebar} aria-label="Toggle menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
      {/* Sidebar overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar}></div>
      
      {
        user ?
        <Sidebar 
          options={options[user.role]} 
          changePage={handlePageChangeWithClose}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        /> :
        null
      }
      <TopBar handleBack={() => handlePageChange(0)} />
      <CurrentPage user={user} />
    </div>
  )
}

export default Dashboard