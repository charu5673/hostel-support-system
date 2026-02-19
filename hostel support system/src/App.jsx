// css import
import './index.css';

// react functionalities import 
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// pages import
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';

// components import

function App() {


  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;