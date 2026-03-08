import '../../index.css'
import { useEffect, useState } from 'react'
import { Constants } from '../../data/Constants'
import BackButton from '../../components/BackButton'

function CheckMenu({ handleBack }) {

  const [menu, setMenu] = useState({})

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  useEffect(()=>{
    const f = async() => {
      try {
        const res = await fetch(`${Constants.API}/get-mess-menu`, {
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

    <div className='check-menu-top-row'>
      <h2>Mess Menu</h2>
      <BackButton handleBack={handleBack} />
    </div>

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

export default CheckMenu;