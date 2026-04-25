import './menu.css'
import { useEffect, useState } from 'react'
import { Constants } from '../../../data/Constants'
import { useLoading } from '../../../contexts/loading/useLoading'

function MessMenuCheck() {

  const [menu, setMenu] = useState({})
  const { loadingFetch } = useLoading()

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  useEffect(()=>{
    const f = async() => {
      try {
        const res = await loadingFetch(`${Constants.API}${Constants.ROUTES.GET_MESS_MENU}`, {
          credentials: "include"
        })
        const d = await res.json()

        if(d.success) {
          let o={}
          d.data.forEach( x => {
            o[x.day] = x
          })
          setMenu(o)
        }
      } catch (e) {
        console.log(e)
      }
    }
    f()
  },[])

  return(
  <div className="check-menu-outer">

    <h2>Mess Menu</h2>

    <table className="mess-table">

      <thead>
        <tr>
          <th>Day</th>
          <th>Breakfast</th>
          <th>Lunch</th>
          <th>Snacks</th>
          <th>Dinner</th>
        </tr>
      </thead>

      <tbody>

      {
        days.map((x, i) => {

        const v=menu[x]||{}

        return (
          <tr key={i}>
            <td className='days'>{x}</td>
            <td>
            {(v.breakfast || "-").split(", ").map((x,i)=>(
              <div key={i}>{x}</div>
            ))}
            </td>
            <td>
            {(v.lunch || "-").split(", ").map((x,i)=>(
              <div key={i}>{x}</div>
            ))}
            </td>
            <td>
            {(v.snacks || "-").split(", ").map((x,i)=>(
              <div key={i}>{x}</div>
            ))}
            </td>
            <td>
            {(v.dinner || "-").split(", ").map((x,i)=>(
              <div key={i}>{x}</div>
            ))}
            </td>
          </tr>
        )

        })
      }

      </tbody>

    </table>

  </div>
  )
}

export default MessMenuCheck;
