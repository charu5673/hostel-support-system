import '../../index.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../contexts/useAlert"
import { Constants } from '../../data/Constants'
import BackButton from '../../components/BackButton'

function ViewItems({ handleBack }) {

  const { showAlert } = useAlert()
  const API = Constants['API']

  const [items, setItems] = useState([])
  const [filter, setFilter] = useState("lost")

  useEffect(() => {

    const loadItems = async () => {

      try {

        const res = await fetch(`${API}/get-reported-items`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch items!", "error")
          return
        }

        const data = await res.json()
        setItems(data)

      } catch {
        showAlert("Failed to load items!", "error")
      }

    }

    loadItems()

  }, [])

  const filteredItems = items.filter(i => i.report_type === filter && i.status === "open")

  return (
    <div className='check-request-outer'>

      <div className='check-request-top-row'>
        <h1>Lost & Found</h1>
        <BackButton handleBack={handleBack} />
      </div>

      <div className='request-filter-row'>

        <button
          className={filter === "lost" ? "active-filter" : ""}
          onClick={() => setFilter("lost")}
        >
          Lost Items
        </button>

        <button
          className={filter === "found" ? "active-filter" : ""}
          onClick={() => setFilter("found")}
        >
          Found Items
        </button>

      </div>

      <div className='requests-list'>

        {filteredItems.length === 0 ? (
          <p>No items reported.</p>
        ) : (

          filteredItems.map((i) => (

            <div className='request-card' key={i.id}>

              <div className='request-header'>
                <h3>{i.item_name}</h3>
                <span className={`status-badge status-${i.status}`}>
                  {i.status}
                </span>
              </div>

              <p className='request-description'>
                {i.description}
              </p>

              {i.image && (
                <img src={i.image} className="report-image" />
              )}

              <div className='request-meta'>
                <span className='request-meta-date'>
                  {filter == 'lost' ? "Lost on: " : "Found on: "}{new Date(i.date).toLocaleDateString()}
                </span>
              </div>

              <p className='request-contact'>
                Contact: {i.contact}
              </p>

            </div>

          ))

        )}

      </div>

    </div>
  )
}

export default ViewItems