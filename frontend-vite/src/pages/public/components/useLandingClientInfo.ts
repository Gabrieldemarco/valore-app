import { useEffect } from 'react';

export default function useLandingClientInfo(
  setClientName: (v: string) => void,
  setClientPhone: (v: string) => void,
  setClientEmail: (v: string) => void,
) {
  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) return;
    const storedName = localStorage.getItem('clientDisplayName') || localStorage.getItem('clientName');
    const storedPhone = localStorage.getItem('clientPhone');
    const storedEmail = localStorage.getItem('clientEmail');
    if (storedName) setClientName(storedName);
    if (storedPhone) setClientPhone(storedPhone);
    if (storedEmail) setClientEmail(storedEmail);
    if (!storedName || !storedPhone || !storedEmail) {
      fetch('/api/client/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(r => r.json())
        .then(data => {
          const displayName = data.user?.name || data.user?.username;
          if (displayName) { setClientName(displayName); localStorage.setItem('clientDisplayName', displayName); }
          if (data.user?.phone) { setClientPhone(data.user.phone); localStorage.setItem('clientPhone', data.user.phone); }
          if (data.user?.email) { setClientEmail(data.user.email); localStorage.setItem('clientEmail', data.user.email); }
        })
        .catch(() => {});
    }
  }, [setClientName, setClientPhone, setClientEmail]);
}
