import { useState } from "react";
import { AlertContext } from "./AlertContext";

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = "info", duration = 3000) => {
    setAlert({ message, type });

    setTimeout(() => {
      setAlert(null);
    }, duration);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}
    </AlertContext.Provider>
  );
}