import { useState } from "react";
import { ConfirmContext } from "./ConfirmContext";

export function ConfirmProvider({ children }) {

  const [confirm, setConfirm] = useState(null);

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setConfirm({
        message,
        resolve
      });
    });
  };

  const handleYes = () => {
    confirm.resolve(true);
    setConfirm(null);
  };

  const handleNo = () => {
    confirm.resolve(false);
    setConfirm(null);
  };

  const handleOutsideClick = () => {
    confirm.resolve(false);
    setConfirm(null);
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}

      {confirm && (
        <div
          className="confirm-overlay"
          onClick={handleOutsideClick}
        >

          <div
            className="confirm"
            onClick={(e) => e.stopPropagation()}
          >

            <p>{confirm.message}</p>

            <div className="confirm-buttons">

              <button
                className="confirm-yes"
                onClick={handleYes}
              >
                Confirm
              </button>

              <button
                className="confirm-no"
                onClick={handleNo}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>
      )}

    </ConfirmContext.Provider>
  );
}