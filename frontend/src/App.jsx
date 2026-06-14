import React, { useState, useEffect } from 'react';
import LightPillar from './LightPillar';
import './App.css';

function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  
  const [turfs, setTurfs] = useState([]);
  const [adminData, setAdminData] = useState({ turfs: [], bookings: [] });
  
  const fallbackTurfs = [
    { turfid: 1, turfname: 'Green Arena', type: 'Football', priceperhour: 1200, location: 'Downtown Sector 5', adminid: 1 },
    { turfid: 2, turfname: 'Blue Sky Box', type: 'Cricket', priceperhour: 1500, location: 'Uptown Heights', adminid: 2 },
    { turfid: 3, turfname: 'The Goal Post', type: 'Football', priceperhour: 1000, location: 'Sector 12 East', adminid: 2 },
    { turfid: 4, turfname: 'Smash It Court', type: 'Badminton', priceperhour: 500, location: 'Mall Road', adminid: 3 },
    { turfid: 5, turfname: 'Velocity Sports', type: 'Multi-sport', priceperhour: 1800, location: 'New Town Park', adminid: 4 }
  ];

  const [selectedTurf, setSelectedTurf] = useState(null);
  const [bookedSlots, setBookedSlots] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [userReceipts, setUserReceipts] = useState([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [number, setNumber] = useState('');
  const [role, setRole] = useState('user');

  useEffect(() => {
    if (view === 'dashboard' && user) {
      if (user.role === 'user') {
        fetch('http://127.0.0.1:5000/api/turfs')
          .then(res => res.json())
          .then(data => setTurfs(data))
          .catch(() => setTurfs(fallbackTurfs));
          
        fetch(`http://127.0.0.1:5000/api/user/bookings/${user.id}`)
          .then(res => res.json())
          .then(data => setUserReceipts(data))
          .catch(() => console.log("Demo: no receipts found"));
          
      } else if (user.role === 'admin') {
        fetch(`http://127.0.0.1:5000/api/admin/dashboard/${user.id}`)
          .then(res => res.json())
          .then(data => setAdminData(data))
          .catch(() => {
            const ownedTurfs = fallbackTurfs.filter(t => t.adminid === user.id);
            setAdminData({
              turfs: ownedTurfs,
              bookings: [
                { bookingid: 101, username: 'Amit Kumar', turfname: ownedTurfs[0]?.turfname || 'N/A', bookingdate: '2026-04-10', duration: 2, totalamount: ownedTurfs[0]?.priceperhour * 2 || 0, status: 'Confirmed' }
              ]
            });
          });
      }
    }
  }, [view, user]);

  const handleLogin = (e) => {
    e.preventDefault();
    fetch('http://127.0.0.1:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    })
    .then(res => {
      if (!res.ok) throw new Error('Backend offline');
      return res.json();
    })
    .then(data => {
      setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
      setView('dashboard');
    })
    .catch(() => {
      const demoName = email.split('@')[0];
      const formattedName = demoName.charAt(0).toUpperCase() + demoName.slice(1);
      setUser({ id: role === 'admin' ? 2 : 1, name: formattedName, email, role });
      setView('dashboard');
    });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    fetch('http://127.0.0.1:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, number, role })
    })
    .then(res => {
      if (!res.ok) throw new Error('Backend offline');
      alert(`Registration successful! Please sign in.`);
      setView('login');
    })
    .catch(() => {
      alert(`Demo Mode: Registration captured for ${name}. Please sign in.`);
      setView('login');
    });
  };

  const initiateBooking = (time) => {
    setPendingSlot(time);
    setShowConfirm(true);
  };

  const finalizeBooking = () => {
    const bookingData = {
      userid: user.id,
      turfid: selectedTurf.turfid,
      bookingdate: bookingDate,
      duration: 1,
      totalamount: selectedTurf.priceperhour,
      status: 'Confirmed'
    };

    fetch('http://127.0.0.1:5000/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    })
    .then(() => {
      fetch(`http://127.0.0.1:5000/api/user/bookings/${user.id}`)
        .then(res => res.json())
        .then(data => setUserReceipts(data));
    })
    .catch(() => console.log("Demo Mode: Booking logged locally."));

    setShowConfirm(false);
    setBookedSlots(prev => ({
      ...prev,
      [`${selectedTurf.turfid}-${bookingDate}-${pendingSlot}`]: true
    }));
    setShowInvoice(true);
  };

  const closeInvoice = () => {
    setShowInvoice(false);
    setPendingSlot(null);
    setView('dashboard');
  };

  const cancelBookingAsAdmin = (bookingId) => {
    if(window.confirm("Are you sure you want to cancel this booking? The user will be refunded.")) {
      fetch(`http://127.0.0.1:5000/api/admin/bookings/${bookingId}`, { method: 'PUT' })
        .then(() => {
          setAdminData(prev => ({
            ...prev,
            bookings: prev.bookings.map(b => b.bookingid === bookingId ? {...b, status: 'Cancelled'} : b)
          }));
        });
    }
  };

  const updatePriceAsAdmin = (turfId, currentPrice) => {
    const newPrice = window.prompt(`Enter new hourly rate (Current: ₹${currentPrice}):`, currentPrice);
    if (newPrice && !isNaN(newPrice) && Number(newPrice) !== Number(currentPrice)) {
      fetch(`http://127.0.0.1:5000/api/admin/turf/${turfId}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(newPrice) })
      }).then(() => {
        setAdminData(prev => ({
          ...prev,
          turfs: prev.turfs.map(t => t.turfid === turfId ? { ...t, priceperhour: Number(newPrice) } : t)
        }));
      });
    }
  };

  const renderNavbar = () => (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => setView('landing')}>
        <div className="nav-title">
          <h1>TURF ARENA</h1>
          <p>Smart Turf Management & Bookings</p>
        </div>
      </div>
      <div className="nav-links">
        <button className="nav-btn" onClick={() => setView('about')}>About Us</button>
        <button className="nav-btn" onClick={() => setView('contact')}>Contact Us</button>
        {user ? (
          <>
            <span style={{fontWeight: 'bold', color: '#1a2b4c'}}>Hi, {user.name}</span>
            <button className="btn-solid" onClick={() => setView('dashboard')}>Dashboard</button>
            <button className="btn-outline" onClick={() => {setUser(null); setView('landing'); setEmail(''); setPassword('');}}>Logout</button>
          </>
        ) : (
          <>
            <button className="btn-outline" onClick={() => setView('login')}>Sign In</button>
            <button className="btn-solid" onClick={() => setView('register')}>Register</button>
          </>
        )}
      </div>
    </nav>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {renderNavbar()}

      {view === 'landing' && (
        <div style={{ position: 'relative', width: '100vw', minHeight: 'calc(100vh - 80px)', backgroundColor: '#0f172a', overflow: 'hidden', flex: 1, margin: 0, left: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            <LightPillar
              topColor="#22c55e"     
              bottomColor="#064e3b"  
              intensity={2.0}
              rotationSpeed={0.3}
              glowAmount={0.005}
              pillarWidth={3.5}
              pillarHeight={0.4}
              noiseIntensity={0.5}
              pillarRotation={25}
              interactive={false}
              mixBlendMode="screen"
              quality="high"
            />
          </div>
          <main className="hero" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '4rem 2rem' }}>
            <div style={{ display: 'flex', gap: '4rem', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div className="hero-text" style={{ flex: 1, minWidth: '300px' }}>
                <h2 style={{ color: '#ffffff', fontSize: '3.5rem', lineHeight: '1.2' }}>Book the Best Turfs.<br/><span className="highlight" style={{ color: '#4ade80' }}>Play Without Limits.</span></h2>
                <p style={{ color: '#ffffff', fontWeight: '500', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)', margin: '1.5rem 0' }}>The ultimate platform to discover, book, and manage sports venues seamlessly. Don't let booking hassles bench you.</p>
                <button className="btn-solid" style={{fontSize: '1.2rem', padding: '1rem 2rem', marginTop: '1rem', border: 'none'}} onClick={() => setView('login')}>
                  Find a Turf Now
                </button>
              </div>
              <div style={{ flex: 1, minWidth: '300px', display: 'flex', justifyContent: 'center' }}>
                <img src="/hero.jpg" alt="Turf Arena" style={{ width: '100%', maxWidth: '500px', height: 'auto', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '4px solid #1e293b', backgroundColor: 'white' }} />
              </div>
            </div>
            
            <div style={{ width: '100%', marginTop: '4rem', padding: '1rem 0', backgroundColor: 'rgba(22, 163, 74, 0.2)', borderTop: '1px solid rgba(74, 222, 128, 0.3)', borderBottom: '1px solid rgba(74, 222, 128, 0.3)' }}>
              <marquee scrollamount="10" style={{ color: '#4ade80', fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                ⚽ SEAMLESS BOOKINGS FOR EVERY SPORT &nbsp; | &nbsp; 🏏 EXPERIENCE PREMIUM PLAYING SURFACES &nbsp; | &nbsp; 🎾 NO MORE DOUBLE BOOKINGS, JUST PURE PLAY &nbsp; | &nbsp; ⚡ SMART VENUE MANAGEMENT AT YOUR FINGERTIPS &nbsp; | &nbsp; 🏆 ELEVATE YOUR GAME TODAY
              </marquee>
            </div>
          </main>
        </div>
      )}

      {view === 'about' && (
        <div className="info-section" style={{maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', flex: 1}}>
          <span style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Our Mission</span>
          <h2 style={{color: '#1a2b4c', margin: '0.5rem 0 2rem 0', fontSize: '2.5rem'}}>Why We Built Turf Arena</h2>
          <p style={{fontSize: '1.1rem', lineHeight: '1.8', color: '#475569', marginBottom: '1.5rem'}}>
            Turf Arena was born out of a simple frustration: finding and booking a sports venue shouldn't be harder than playing the game itself. We noticed that managers were losing revenue due to double-bookings on WhatsApp, while players were wasting hours just trying to find an open field.
          </p>
          <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', borderLeft: '4px solid #16a34a', margin: '2rem 0', textAlign: 'left' }}>
            <h3 style={{ color: '#1a2b4c', marginTop: 0 }}>The Power of Outdoor Sports</h3>
            <p style={{fontSize: '1.1rem', lineHeight: '1.8', color: '#475569', marginBottom: 0}}>
              We believe getting off the screen and onto the turf is essential. Physical activity reduces stress, builds social connections, and fosters teamwork. Turf Arena acts as the digital bridge to get you back into the physical game faster.
            </p>
          </div>
        </div>
      )}

      {view === 'contact' && (
        <div className="info-section" style={{maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', flex: 1, textAlign: 'center'}}>
          <h2 style={{color: '#1a2b4c', fontSize: '2.5rem', marginBottom: '1rem'}}>We're Here to Help</h2>
          <p style={{fontSize: '1.1rem', color: '#64748b', marginBottom: '3rem'}}>Have a question about a booking or want to list your turf? Reach out to us.</p>
          <div style={{display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <div style={{background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, minWidth: '250px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
              <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>📧</div>
              <h3 style={{color: '#1a2b4c', margin: '0 0 0.5rem 0'}}>Email Support</h3>
              <p style={{color: '#16a34a', fontWeight: 'bold', margin: 0}}>support@turfarena.com</p>
            </div>
            <div style={{background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, minWidth: '250px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
              <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>📞</div>
              <h3 style={{color: '#1a2b4c', margin: '0 0 0.5rem 0'}}>Phone Hotline</h3>
              <p style={{color: '#16a34a', fontWeight: 'bold', margin: 0}}>+91 98765 43210</p>
            </div>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div className="auth-container" style={{ flex: 1 }}>
          <div className="auth-card">
            <h2>Welcome Back</h2>
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">I am a Player</option>
                <option value="admin">I am a Turf Owner (Admin)</option>
              </select>
              <button type="submit" className="btn-solid">Sign In</button>
            </form>
          </div>
        </div>
      )}

      {view === 'register' && (
        <div className="auth-container" style={{ flex: 1 }}>
          <div className="auth-card">
            <h2>Create Account</h2>
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="tel" placeholder="Phone Number" value={number} onChange={e => setNumber(e.target.value)} required />
              <input type="password" placeholder="Create Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">Register as Player</option>
                <option value="admin">Register as Turf Owner</option>
              </select>
              <button type="submit" className="btn-solid">Register Now</button>
            </form>
          </div>
        </div>
      )}

      {view === 'dashboard' && user?.role === 'admin' && (
        <div className="dashboard" style={{ flex: 1 }}>
          <div className="dashboard-header">
            <h2>Admin Control Panel</h2>
            <span style={{color: '#64748b'}}>Manage your venues and bookings</span>
          </div>
          
          <h3 style={{color: '#1a2b4c', marginBottom: '1rem'}}>My Venues</h3>
          <div className="grid" style={{marginBottom: '3rem'}}>
            {adminData.turfs.map(t => (
              <div key={t.turfid} className="card" style={{cursor: 'default'}}>
                <span className="badge">{t.type}</span>
                <h3 style={{color: '#1a2b4c', margin: '0.5rem 0'}}>{t.turfname}</h3>
                <p style={{color: '#64748b', marginBottom: '1rem'}}>{t.location}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong style={{color: '#1a2b4c', fontSize: '1.2rem'}}>₹{t.priceperhour}/hr</strong>
                  <button className="btn-outline" style={{padding: '0.3rem 0.6rem', fontSize: '0.85rem'}} onClick={() => updatePriceAsAdmin(t.turfid, t.priceperhour)}>Edit Price</button>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{color: '#1a2b4c', marginBottom: '1rem'}}>Recent Bookings</h3>
          <div style={{background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
              <thead style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0'}}>
                <tr>
                  <th style={{padding: '1rem'}}>ID</th>
                  <th style={{padding: '1rem'}}>Player</th>
                  <th style={{padding: '1rem'}}>Venue</th>
                  <th style={{padding: '1rem'}}>Date</th>
                  <th style={{padding: '1rem'}}>Status</th>
                  <th style={{padding: '1rem'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminData.bookings.map(b => (
                  <tr key={b.bookingid} style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={{padding: '1rem'}}>#{b.bookingid}</td>
                    <td style={{padding: '1rem', fontWeight: 'bold'}}>{b.username}</td>
                    <td style={{padding: '1rem'}}>{b.turfname}</td>
                    <td style={{padding: '1rem'}}>{b.bookingdate}</td>
                    <td style={{padding: '1rem'}}>
                      <span style={{color: b.status === 'Cancelled' ? '#ef4444' : '#16a34a', fontWeight: 'bold'}}>{b.status}</span>
                    </td>
                    <td style={{padding: '1rem'}}>
                      {b.status !== 'Cancelled' && (
                        <button className="btn-danger" onClick={() => cancelBookingAsAdmin(b.bookingid)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'dashboard' && user?.role === 'user' && (
        <div className="dashboard" style={{ flex: 1 }}>
          <div className="dashboard-header">
            <h2>Available Venues</h2>
            <span style={{color: '#64748b'}}>Select a turf to view slots</span>
          </div>
          <div className="grid">
            {turfs.map(t => (
              <div key={t.turfid} className="card" onClick={() => { setSelectedTurf(t); setView('booking'); }}>
                <span className="badge">{t.type}</span>
                <h3 style={{color: '#1a2b4c', margin: '0.5rem 0'}}>{t.turfname}</h3>
                <p style={{color: '#64748b', marginBottom: '1rem'}}>{t.location}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong style={{color: '#1a2b4c', fontSize: '1.2rem'}}>₹{t.priceperhour}/hr</strong>
                  <button className="btn-solid" style={{padding: '0.4rem 1rem'}}>View Slots</button>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{color: '#1a2b4c', margin: '4rem 0 1rem 0'}}>My Booked Receipts</h3>
          {userReceipts.length === 0 ? (
            <p style={{color: '#64748b'}}>No past bookings found. Time to play!</p>
          ) : (
            <div style={{background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '2rem'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                <thead style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0'}}>
                  <tr>
                    <th style={{padding: '1rem'}}>Receipt ID</th>
                    <th style={{padding: '1rem'}}>Venue</th>
                    <th style={{padding: '1rem'}}>Date</th>
                    <th style={{padding: '1rem'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userReceipts.map(r => (
                    <tr key={r.bookingid} style={{borderBottom: '1px solid #e2e8f0'}}>
                      <td style={{padding: '1rem'}}>#{r.bookingid}</td>
                      <td style={{padding: '1rem', fontWeight: 'bold'}}>{r.turfname}</td>
                      <td style={{padding: '1rem'}}>{new Date(r.bookingdate).toLocaleDateString()}</td>
                      <td style={{padding: '1rem'}}>
                        {r.status === 'Cancelled' ? (
                          <span style={{color: '#ef4444', fontSize: '0.9rem'}}>Cancelled by Admin.<br/>Refund initiated in 24 hrs.</span>
                        ) : (
                          <span style={{color: '#16a34a', fontWeight: 'bold'}}>{r.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'booking' && selectedTurf && user?.role === 'user' && (
        <div className="dashboard" style={{maxWidth: '600px', flex: 1}}>
          <button className="btn-outline" style={{marginBottom: '2rem'}} onClick={() => setView('dashboard')}>&larr; Back to Venues</button>
          <div className="card" style={{padding: '2rem'}}>
            <h2 style={{color: '#1a2b4c', margin: '0 0 0.5rem 0'}}>Book {selectedTurf.turfname}</h2>
            <p style={{fontSize: '1.2rem', marginBottom: '2rem', color: '#475569'}}>Rate: <strong style={{color: '#1a2b4c'}}>₹{selectedTurf.priceperhour}</strong>/hr</p>
            
            <h3 style={{marginBottom: '0.5rem', color: '#1a2b4c', fontSize: '1rem'}}>1. Select Date:</h3>
            <input 
              type="date" 
              value={bookingDate} 
              onChange={(e) => setBookingDate(e.target.value)} 
              style={{padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '2rem', width: '100%', fontSize: '1rem', fontFamily: 'inherit'}}
              min={new Date().toISOString().split('T')[0]} 
            />

            <h3 style={{marginBottom: '1rem', color: '#1a2b4c', fontSize: '1rem'}}>2. Select Slot:</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              {['6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'].map(time => {
                const isBooked = bookedSlots[`${selectedTurf.turfid}-${bookingDate}-${time}`];
                return (
                  <button 
                    key={time} 
                    className={isBooked ? "btn-disabled" : "btn-outline"}
                    disabled={isBooked}
                    onClick={() => initiateBooking(time)}>
                    {isBooked ? `${time} (Booked)` : time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{color: '#1a2b4c', marginBottom: '1rem', marginTop: 0}}>Confirm Booking</h2>
            <p style={{color: '#475569', fontSize: '1.1rem', lineHeight: '1.6'}}>Are you sure you want to book <strong>{selectedTurf.turfname}</strong> on <strong>{bookingDate}</strong> at <strong>{pendingSlot}</strong>?</p>
            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
              <button className="btn-outline" style={{flex: 1}} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-solid" style={{flex: 1}} onClick={finalizeBooking}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '64px', height: '64px', margin: '0 auto 1rem auto', display: 'block'}}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 style={{color: '#1a2b4c', margin: '0 0 1rem 0'}}>Payment Successful</h2>
            <div className="invoice-box">
              <div className="invoice-watermark">PAID</div>
              <div className="invoice-header">
                <h4>Digital Receipt</h4>
                <span>#{Math.floor(Math.random() * 90000) + 10000}</span>
              </div>
              <div className="invoice-row"><span>Customer:</span> <strong>{user?.name}</strong></div>
              <div className="invoice-row"><span>Venue:</span> <strong>{selectedTurf.turfname}</strong></div>
              <div className="invoice-row"><span>Date:</span> <strong>{bookingDate}</strong></div>
              <div className="invoice-row"><span>Time Slot:</span> <strong>{pendingSlot}</strong></div>
              <hr style={{borderTop: '1px solid #e2e8f0', margin: '1rem 0'}}/>
              <div className="invoice-row"><span>Total Amount Paid:</span> <strong style={{color: '#16a34a', fontSize: '1.2rem'}}>₹{selectedTurf.priceperhour}.00</strong></div>
            </div>
            <button className="btn-solid" style={{width: '100%', marginTop: '1rem'}} onClick={closeInvoice}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Receipt & Close
            </button>
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '1.5rem', marginTop: 'auto', borderTop: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', backgroundColor: 'white' }}>
        Made by Soham & Ritik!
      </footer>
    </div>
  );
}

export default App;