import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../index.css';

function VerificationPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [statusIndex, setStatusIndex] = useState(0);
  const ranRef = useRef(false);

  const status = [
    <p key="loading" className="verification-text">
      Verifying your account...
    </p>,
    <p key="success" className="verification-text">
      Your account has been verified! Click{' '}
      <span onClick={() => navigate('/login')} className="blue-text">
        here
      </span>{' '}
      if you are not redirected.
    </p>,
    <p key="error" className="verification-text">
      Verification link expired or invalid.
    </p>,
  ];

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let timeoutId;

    const verify = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:5000/verify/${token}`
        );

        if (!res.ok) {
          setStatusIndex(2);
          return;
        }

        await res.json();
        setStatusIndex(1);

        timeoutId = setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        console.error(err);
        setStatusIndex(2);
      }
    };

    verify();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [token, navigate]);

  return (
    <div className="verification-page-outer">
      {status[statusIndex]}
    </div>
  );
}

export default VerificationPage;