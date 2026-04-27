import './configuration.css'
import { useState, useEffect } from 'react'
import { useAlert } from "../../../contexts/alert/useAlert"
import { useLoading } from "../../../contexts/loading/useLoading"
import { Constants } from '../../../data/Constants'

function ConfigurationSet() {

  const { showAlert } = useAlert()
  const { loadingFetch } = useLoading()
  const API = Constants['API']

  const [configs, setConfigs] = useState([])
  const [editingConfig, setEditingConfig] = useState(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const res = await loadingFetch(`${API}${Constants.ROUTES.GET_CONFIG}`, {
          credentials: "include"
        })

        if (!res.ok) {
          showAlert("Could not fetch configurations!", "error")
          return
        }

        const data = await res.json()
        setConfigs(data)
      } catch {
        showAlert("Failed to load configurations!", "error")
      }
    }

    loadConfigs()
  }, [API, loadingFetch, showAlert])

  const updateConfig = async (key, value) => {
    try {
      const res = await loadingFetch(`${API}${Constants.ROUTES.UPDATE_CONFIG}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ key, value })
      })

      if (!res.ok) {
        showAlert("Could not update configuration!", "error")
        return
      }

      showAlert("Configuration updated successfully!", "success")
      setEditingConfig(null)
      
      // Reload configs
      const reloadRes = await loadingFetch(`${API}${Constants.ROUTES.GET_CONFIG}`, {
        credentials: "include"
      })
      if (reloadRes.ok) {
        const data = await reloadRes.json()
        setConfigs(data)
      }
    } catch {
      showAlert("Failed to update configuration!", "error")
    }
  }

  const handleEdit = (key, value) => {
    setEditingConfig(key)
    setEditValue(value)
  }

  const handleSave = (key) => {
    if (editValue.trim() === "") {
      showAlert("Value cannot be empty!", "error")
      return
    }
    updateConfig(key, editValue.trim())
  }

  const handleCancel = () => {
    setEditingConfig(null)
    setEditValue("")
  }

  const getConfigType = (config) => {
    // Determine input type based on key name
    const key = config.key?.toLowerCase() || ""
    if (key.includes("enabled") || key.includes("active") || key.includes("is_") || key.includes("allow")) {
      return "boolean"
    }
    if (key.includes("count") || key.includes("limit") || key.includes("max") || key.includes("min") || key.includes("age") || key.includes("port")) {
      return "number"
    }
    return "string"
  }

  return (
    <div className='view_config-outer'>

      <h1>System Configurations</h1>

      {configs.length === 0 ? (
        <h2>No configurations found!</h2>
      ) : (
        <div className='configs-list'>

          {configs.map((config, i) => (
            <div className='config-card' key={config.config_key || config.key || i}>

              <div className='config-header'>
                <div className='config-header-left'>
                  <h3>{config.config_key || config.key}</h3>
                </div>
                <div className='config-header-right'>
                  <span className='config-date'>
                    {config.created_at ? new Date(config.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className='config-value-section'>
                {editingConfig === (config.config_key || config.key) ? (
                  <div className='config-edit-section'>
                    {(config.type === 'boolean' || getConfigType(config) === 'boolean') ? (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className='config-select'
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (config.type === 'int' || config.type === 'float' || getConfigType(config) === 'number') ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className='config-input'
                      />
                    ) : (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className='config-input'
                      />
                    )}
                    <div className='config-edit-buttons'>
                      <button
                        className='config-save-btn'
                        onClick={() => handleSave(config.config_key || config.key)}
                      >
                        Save
                      </button>
                      <button
                        className='config-cancel-btn'
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='config-display-section'>
                    <span className={`config-value ${config.value === 'true' ? 'boolean-true' : config.value === 'false' ? 'boolean-false' : ''}`}>
                      {config.value}
                    </span>
                    <button
                      className='config-edit-btn'
                      onClick={() => handleEdit(config.config_key || config.key, config.value)}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  )
}

export default ConfigurationSet