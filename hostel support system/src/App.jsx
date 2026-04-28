// css import
import './index.css';

// react functionalities import 
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// pages import
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import Dashboard from './pages/Dashboard';
import VerificationPage from './pages/VerificationPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// components import

function App() {


  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/verify/:token" element={<VerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;