// css import
import '../index.css';

// react functionalities import 
// import { useNavigate } from 'react-router-dom';

// pages import


// components import

import Sidebar from '../components/Sidebar';


// hooks import


function Dashboard() {

  // const navigate = useNavigate();

  return (
    <div className='dashboard-outer'>
      <Sidebar />
    </div>
  );
}

export default Dashboard;