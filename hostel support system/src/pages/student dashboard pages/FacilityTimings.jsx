import '../../index.css'
import { useEffect, useState } from 'react'
import { Constants } from '../../data/Constants'
import BackButton from '../../components/BackButton'

function FacilityTimings({ handleBack }) {

  const [facilityTimings, setFacilityTimings] = useState({})

  const daysOfWeek = [
    "Monday","Tuesday","Wednesday",
    "Thursday","Friday","Saturday","Sunday"
  ]

  useEffect(()=>{

    const fetchFacilityTimings = async() => {

      try {

        const response = await fetch(
          `${Constants.API}/get-facility-timings`,
          { credentials:"include" }
        )

        const result = await response.json()

        if(result.success){

          let formattedTimings = {}

          result.data.forEach(row => {

            if(!formattedTimings[row.facility])
              formattedTimings[row.facility] = {}

            formattedTimings[row.facility][row.day] = row

          })

          setFacilityTimings(formattedTimings)

        }

      } catch(error){
        console.log(error)
      }

    }

    fetchFacilityTimings()

  },[])

  return(

  <div className="check-menu-outer">

    <div className="check-menu-top-row">
      <h2>Facility Timings</h2>
      <BackButton handleBack={handleBack}/>
    </div>

    <table className="mess-table">

      <thead>
        <tr>
          <th>Facility</th>

          {
            daysOfWeek.map((day,index)=>(
              <th key={index}>{day}</th>
            ))
          }

        </tr>
      </thead>

      <tbody>

      {
        Object.keys(facilityTimings).map((facility,index)=>{

          const facilitySchedule = facilityTimings[facility]

          return(

          <tr key={index}>

            <td className="days">{facility}</td>

            {
              daysOfWeek.map((day,dayIndex)=>{

                const dayTiming = facilitySchedule[day]

                if(!dayTiming)
                  return <td key={dayIndex}>-</td>

                if(dayTiming.is_closed)
                  return <td key={dayIndex}>Closed</td>

                return(
                  <td key={dayIndex}>
                    {dayTiming.start_time.slice(0,5)} - {dayTiming.end_time.slice(0,5)}
                  </td>
                )

              })
            }

          </tr>

          )

        })
      }

      </tbody>

    </table>

  </div>

  )
}

export default FacilityTimings