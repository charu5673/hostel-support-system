import './email-domain.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'
import { useConfirm } from '../../../contexts/confirm/useConfirm'

function EmailDomainsView() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']
  const { showConfirm } = useConfirm()

  const [domains, setDomains] = useState([])
  const [filter, setFilter] = useState(null) // null = all, true = active, false = inactive
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [newDomain, setNewDomain] = useState("")

  useEffect(() => {
    const loadDomains = async () => {
      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_EMAIL_DOMAINS}`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch domains!", "error")
          return
        }

        const data = await res.json()
        setDomains(data)

      } catch {
        showAlert("Failed to load domains!", "error")
      }
    }

    loadDomains()
  }, [])

  const removeDomain = async (id) => {

    const confirmCancel = await showConfirm("Remove this domain?")
    if (!confirmCancel) return

    try {

      const res = await loadingFetch(`${API}${Constants.ROUTES.REMOVE_EMAIL_DOMAIN}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({id})
      })

      if (!res.ok) {
        showAlert("Could not remove domain!", "error")
        return
      }

      setDomains(prev => prev.filter(d => d.id !== id))

      showAlert("Domain removed successfully!", "success")

    } catch {
      showAlert("Failed to remove domain!", "error")
    }

  }

  const toggleDomain = async (id, isActive, i) => {

    try {

      const res = await loadingFetch(`${API}${Constants.ROUTES.TOGGLE_EMAIL_DOMAIN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({id, is_active: isActive})
      })

      if (!res.ok) {
        showAlert("Could not toggle domain!", "error")
        return
      }

      let newDomains = [...domains]

      newDomains[i].is_active = isActive;
      setDomains(newDomains);


      showAlert("Domain toggled successfully!", "success")

    } catch {
      showAlert("Failed to toggle domain!", "error")
    }

  }

  const addDomain = async (domain) => {

    if (!domain || domain.trim() === "") {
      showAlert("Please enter a domain!", "error")
      return
    }

    try {

      const res = await loadingFetch(`${API}${Constants.ROUTES.ADD_EMAIL_DOMAIN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({domain: domain.trim()})
      })

      if (!res.ok) {
        showAlert("Could not add domain!", "error")
        return
      }

      try {

        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_EMAIL_DOMAINS}`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch domains!", "error")
          return
        }

        const data = await res.json()
        setDomains(data)

      } catch {
        showAlert("Failed to load domains!", "error")
      }


      showAlert("Domain added successfully!", "success")

    } catch {
      showAlert("Failed to add domain!", "error")
    }

  }

  const handleAddDomain = () => {
    if (newDomain.trim()) {
      addDomain(newDomain.trim())
      setNewDomain("")
      setShowAddPopup(false)
    }
  }

  const filteredDomains =
    filter === null
      ? domains
      : domains.filter(d => d.is_active === filter)

  return (
    <div className='view_domain-outer'>

      <h1>Email domains</h1>

      <button
        className='add-domain-btn'
        onClick={() => setShowAddPopup(true)}
      >
        Add
      </button>

      {domains.length === 0 ? (
        <h2>No domains added!</h2>
      ) : (
        <>
          <div className='domain-filter-row'>

            <button
              className={filter === null ? "active-filter" : ""}
              onClick={() => setFilter(null)}
            >
              All
            </button>

            <button
              className={filter === true ? "active-filter" : ""}
              onClick={() => setFilter(true)}
            >
              Active
            </button>

            <button
              className={filter === false ? "active-filter" : ""}
              onClick={() => setFilter(false)}
            >
              Inactive
            </button>

          </div>

          <div className='domains-list'>

            {filteredDomains.length === 0 ? (
              <p>No domains in this category.</p>
            ) : (
              filteredDomains.map((d, i) => (
                <div className='domain-card' key={crypto.randomUUID()}>

                  <div className='domain-header'>
                    <div className='domain-header-left'>
                      <h3>{d.domain}</h3>
                    </div>
                    <div className='domain-header-right'>
                      <span className={`status-badge status-${d.is_active ? "active" : "inactive"}`}>
                        {d.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className='domain-date'>
                        {new Date(d.created_at || d.applied_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                    <button
                      className='remove-domain-button'
                      onClick={() => removeDomain(d.id)}
                    >
                      Remove
                    </button>
                    <button
                      className='toggle-domain-button'
                      onClick={() => toggleDomain(d.id, !d.is_active, i)}
                    >
                      Toggle
                    </button>

                </div>
              ))
            )}

          </div>
        </>
      )}

      {showAddPopup && (
        <div className='domain-popup-overlay' onClick={() => setShowAddPopup(false)}>
          <div className='domain-popup' onClick={(e) => e.stopPropagation()}>
            <h2>Add New Domain</h2>
            <input
              type="text"
              placeholder="Enter domain (e.g., example.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            />
            <div className='domain-popup-buttons'>
              <button onClick={() => setShowAddPopup(false)}>Cancel</button>
              <button onClick={handleAddDomain}>Add</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default EmailDomainsView
