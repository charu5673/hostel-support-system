import { useRef, useState } from "react";
import { UpdateContext } from "./UpdateContext";

export function UpdateProvider({ children }) {

  const [update, setUpdate] = useState(null);
  const note = useRef();
  const newRoomRef = useRef();

  const showUpdate = (message, action, newRoom = null, requestType = null) => {
    return new Promise((resolve) => {
      setUpdate({
        message,
        action,
        newRoom,
        requestType,
        resolve
      });
    });
  };

  const handleYes = () => {
    update.resolve({
      'update': true,
      'note': note.current.value,
      'newRoom': newRoomRef.current.value ? newRoomRef.current.value : null,
    });
    setUpdate(null);
  };

  const handleNo = () => {
    update.resolve({
      'update': false,
    });
    setUpdate(null);
  };

  const handleOutsideClick = () => {
    update.resolve({
      'update': false,
    });
    setUpdate(null);
  };

  return (
    <UpdateContext.Provider value={{ showUpdate }}>
      {children}

      {update && (
        <div
          className="update-overlay"
          onClick={handleOutsideClick}
        >

          <div
            className="update"
            onClick={(e) => e.stopPropagation()}
          >

            <p>{update.message}</p>

            <input type='text' className="update-note" ref={note} placeholder="Add a note? (Optional)"></input>
            {
              update.requestType == "room_change" && update.action == "Approve" &&
              ( <>
                  <label htmlFor='update-new-room'>New Room:</label>
                  {
                    update.newRoom ?
                    <input required type='text' className="update-new-room" ref={newRoomRef} placeholder="New room" value={update.newRoom}></input> : 
                    <input required type='text' className="update-new-room" ref={newRoomRef} placeholder="New room" ></input>
                  }
              </> )
            }

            <div className="update-buttons">

              <button
                className="update-yes"
                type='submit'
                onClick={handleYes}
              >
                {update.action}
              </button>

              <button
                className="update-no"
                type='button'
                onClick={handleNo}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>
      )}

    </UpdateContext.Provider>
  );
}