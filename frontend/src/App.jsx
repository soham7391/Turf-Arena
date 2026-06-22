import React, { useState, useEffect } from 'react';
import LightPillar from './LightPillar';
import './App.css';

function App() {
  const [view, setView] = useState('landing'); 
  const [newTurf, setNewTurf] = useState({
    turfname: '',
    type: 'Football',
    location: '',
    priceperhour: '',
    imageFile: null,
    google_maps_link: '',
    contact_email: ''
  });
  
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('turf_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [turfs, setTurfs] = useState([]);
  const [adminData, setAdminData] = useState({ turfs: [], bookings: [] });
  
  const fallbackTurfs = [
    { turfid: 1, turfname: 'Green Arena', type: 'Football', priceperhour: 1200, location: 'Downtown Sector 5', adminid: 1 },
    { turfid: 2, turfname: 'Blue Sky Box', type: 'Cricket', priceperhour: 1500, location: 'Uptown Heights', adminid: 2 }
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
const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: null });
  const [priceModal, setPriceModal] = useState({ isOpen: false, turfId: null, currentPrice: '' });
  const [newPriceInput, setNewPriceInput] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [deleteTurfModal, setDeleteTurfModal] = useState({ isOpen: false, turfId: null, turfName: '' });

  const triggerAlert = (title, message, isError = false) => {
    setAlertModal({ isOpen: true, title, message, isError });
  };

  const initiateDeleteTurf = (turfId, turfName) => {
    setDeleteTurfModal({ isOpen: true, turfId, turfName });
  };

  const confirmDeleteTurf = () => {
    const turfId = deleteTurfModal.turfId;
    fetch(`http://127.0.0.1:5000/api/admin/turf/${turfId}`, { method: 'DELETE' })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to delete venue');
        setAdminData(prev => ({
          ...prev,
          turfs: prev.turfs.filter(t => t.turfid !== turfId)
        }));
        setDeleteTurfModal({ isOpen: false, turfId: null, turfName: '' });
        triggerAlert('Deleted', 'The venue has been permanently removed.');
      })
      .catch(err => {
        triggerAlert('Error', err.message, true);
        setDeleteTurfModal({ isOpen: false, turfId: null, turfName: '' });
      });
  };
  const handleAddTurf = (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('turfname', newTurf.turfname);
    formData.append('type', newTurf.type);
    formData.append('location', newTurf.location);
    formData.append('priceperhour', newTurf.priceperhour);
    formData.append('adminid', user.id);
    formData.append('google_maps_link', newTurf.google_maps_link);
    formData.append('contact_email', newTurf.contact_email);
    if (newTurf.imageFile) {
      formData.append('image', newTurf.imageFile);
    }

    fetch('http://127.0.0.1:5000/api/turfs', {
      method: 'POST',
      body: formData 
    })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add turf');
      }
      return res.json();
    })
    .then(data => {
      triggerAlert('Success!', 'Venue successfully added to your dashboard.');
      setAdminData(prev => ({
        ...prev,
        turfs: [...prev.turfs, {
          turfid: data.turfid,
          turfname: newTurf.turfname,
          type: newTurf.type,
          location: newTurf.location,
          priceperhour: Number(newTurf.priceperhour),
          image_url: newTurf.imageFile ? URL.createObjectURL(newTurf.imageFile) : ''
        }]
      }));
      setNewTurf({ turfname: '', type: 'Football', location: '', priceperhour: '', imageFile: null, google_maps_link: '', contact_email: '' });
    })
    .catch(err => {
      alert(`Error: ${err.message}`);
    });
  };

useEffect(() => {
    if (view === 'dashboard' && user) {
      if (user.role === 'user') {
        fetch('http://127.0.0.1:5000/api/turfs')
          .then(res => res.json())
          .then(data => {
            if (data.error) console.error("Turf Error:", data.error);
            else setTurfs(data);
          })
          .catch(() => console.log("Waiting for database connection..."));
          
        fetch(`http://127.0.0.1:5000/api/user/bookings/${user.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.error) console.error("Booking Error:", data.error);
            else setUserReceipts(data);
          })
          .catch(() => console.log("No receipts found"));
          
      } else if (user.role === 'admin') {
        fetch(`http://127.0.0.1:5000/api/admin/dashboard/${user.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.error) console.error("Admin Error:", data.error);
            else setAdminData(data);
          })
          .catch(() => console.log("Waiting for database connection..."));
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
    .then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Invalid credentials');
      }
      return res.json();
    })
    .then(data => {
      const userData = { id: data.id, name: data.name, email: data.email, role: data.role };
      setUser(userData);
      localStorage.setItem('turf_user', JSON.stringify(userData)); 
      setView('dashboard');
    })
    .catch(err => {
      triggerAlert('Login Failed!', err.message, true);
    });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    fetch('http://127.0.0.1:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, number, role })
    })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Backend Error: ${err.error}`);
      }
      triggerAlert(`Registration successful! Please sign in.`);
      setView('login');
      setPassword(''); 
    })
    .catch(err => {
      alert(err.message);
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
      timeslot: pendingSlot,
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

  const initiateCancelAsAdmin = (bookingId) => {
    setCancelModal({ isOpen: true, bookingId });
  };

  const confirmCancelBooking = () => {
    const bookingId = cancelModal.bookingId;
    fetch(`http://127.0.0.1:5000/api/admin/bookings/${bookingId}`, { method: 'PUT' })
      .then(() => {
        setAdminData(prev => ({
          ...prev,
          bookings: prev.bookings.map(b => b.bookingid === bookingId ? {...b, status: 'Cancelled'} : b)
        }));
        setCancelModal({ isOpen: false, bookingId: null });
      });
  };

  const initiatePriceUpdate = (turfId, currentPrice) => {
    setNewPriceInput(currentPrice); 
    setPriceModal({ isOpen: true, turfId, currentPrice });
  };

  const confirmPriceUpdate = (e) => {
    e.preventDefault(); 
    const { turfId, currentPrice } = priceModal;
    
    if (newPriceInput && !isNaN(newPriceInput) && Number(newPriceInput) !== Number(currentPrice)) {
      fetch(`http://127.0.0.1:5000/api/admin/turf/${turfId}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(newPriceInput) })
      }).then(() => {
        setAdminData(prev => ({
          ...prev,
          turfs: prev.turfs.map(t => t.turfid === turfId ? { ...t, priceperhour: Number(newPriceInput) } : t)
        }));
        setPriceModal({ isOpen: false, turfId: null, currentPrice: '' });
      });
    } else {
      setPriceModal({ isOpen: false, turfId: null, currentPrice: '' });
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
            <button className="btn-outline" onClick={() => {setUser(null); localStorage.removeItem('turf_user'); setView('landing'); setEmail(''); setPassword('');}}>Logout</button>
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
            <div style={{ width: '100%', marginTop: '4rem', padding: '1.2rem 0', backgroundColor: '#000000', borderTop: '2px solid #222', borderBottom: '2px solid #222' }}>
              <marquee scrollamount="10" style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                ⚽ SEAMLESS BOOKINGS FOR EVERY SPORT &nbsp; | &nbsp; 🏏 EXPERIENCE PREMIUM PLAYING SURFACES &nbsp; | &nbsp; 🎾 NO MORE DOUBLE BOOKINGS, JUST PURE PLAY &nbsp; | &nbsp; ⚡ SMART VENUE MANAGEMENT AT YOUR FINGERTIPS &nbsp; | &nbsp; 🏆 ELEVATE YOUR GAME TODAY!
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
              <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center'}}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{width: '100%', paddingRight: '40px', marginBottom: 0}} />
                <span onClick={() => setShowPassword(!showPassword)} style={{position: 'absolute', right: '10px', cursor: 'pointer', fontSize: '1.2rem', userSelect: 'none'}}>
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </div>
              <div style={{height: '1rem'}}></div>
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
              <div style={{position: 'relative', width: '100%', display: 'flex', alignItems: 'center'}}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{width: '100%', paddingRight: '40px', marginBottom: 0}} />
                <span onClick={() => setShowPassword(!showPassword)} style={{position: 'absolute', right: '10px', cursor: 'pointer', fontSize: '1.2rem', userSelect: 'none'}}>
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </div>
              <div style={{height: '1rem'}}></div>
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
          <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', border: '2px dashed #cbd5e1' }}>
            <h3 style={{ color: '#1a2b4c', marginTop: 0, marginBottom: '1rem' }}>+ Add a New Venue</h3>
            <form onSubmit={handleAddTurf} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
              <input type="text" placeholder="Turf Name (e.g. Velocity Sports)" value={newTurf.turfname} onChange={(e) => setNewTurf({...newTurf, turfname: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <select value={newTurf.type} onChange={(e) => setNewTurf({...newTurf, type: e.target.value})} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="Football">Football</option>
                <option value="Cricket">Cricket</option>
                <option value="Tennis">Tennis</option>
                <option value="Multisport">Multisport</option>
              </select>
              <input type="text" placeholder="Location (e.g. Andheri West)" value={newTurf.location} onChange={(e) => setNewTurf({...newTurf, location: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="number" min="1" placeholder="Price per Hour (₹)" value={newTurf.priceperhour} onChange={(e) => setNewTurf({...newTurf, priceperhour: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="email" placeholder="Public Contact Email for Turf" value={newTurf.contact_email} onChange={(e) => setNewTurf({...newTurf, contact_email: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="Google Maps Link (Optional)" value={newTurf.google_maps_link} onChange={(e) => setNewTurf({...newTurf, google_maps_link: e.target.value})} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Upload Turf Image *</label>
                <input type="file" accept="image/*" onChange={(e) => setNewTurf({...newTurf, imageFile: e.target.files[0]})} required style={{ padding: '0.8rem', borderRadius: '6px', border: '1px dashed #cbd5e1', background: '#fff' }} />
              </div>
              <button type="submit" className="btn-solid" style={{ gridColumn: 'span 2', padding: '0.8rem' }}>Create Turf</button>
            </form>
          </div>
          
          <h3 style={{color: '#1a2b4c', marginBottom: '1rem'}}>My Venues</h3>
          <div className="grid" style={{marginBottom: '3rem'}}>
            {adminData.turfs.filter(t => t.image_url && t.image_url !== '').map(t => (
              <div key={t.turfid} className="card" style={{cursor: 'default'}}>
                <span className="badge">{t.type}</span>
                <h3 style={{color: '#1a2b4c', margin: '0.5rem 0'}}>{t.turfname}</h3>
                <p style={{color: '#64748b', marginBottom: '1rem'}}>{t.location}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong style={{color: '#1a2b4c', fontSize: '1.2rem'}}>₹{t.priceperhour}/hr</strong>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn-outline" style={{padding: '0.3rem 0.6rem', fontSize: '0.85rem'}} onClick={() => initiatePriceUpdate(t.turfid, t.priceperhour)}>Edit</button>
                    <button className="btn-danger" style={{padding: '0.3rem 0.6rem', fontSize: '0.85rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}} onClick={() => initiateDeleteTurf(t.turfid, t.turfname)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div> 
          <h3 style={{color: '#1a2b4c', marginBottom: '1rem'}}>Recent Bookings</h3>
          <div style={{background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '2rem'}}>
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
                    <td style={{padding: '1rem'}}>{b.bookingdate.split(' 00:00:00')[0]} at {b.timeslot}</td>
                    <td style={{padding: '1rem'}}>
                      <span style={{color: b.status === 'Cancelled' ? '#ef4444' : '#16a34a', fontWeight: 'bold'}}>{b.status}</span>
                    </td>
                    <td style={{padding: '1rem'}}>
                      {b.status !== 'Cancelled' && (
                        <button className="btn-danger" onClick={() => initiateCancelAsAdmin(b.bookingid)}>Cancel</button>
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
            {turfs.filter(t => t.image_url && t.image_url !== '').map(t => (
              <div key={t.turfid} className="card" onClick={() => { setSelectedTurf(t); setView('booking'); }} style={{ padding: 0, overflow: 'hidden' }}>
                {t.image_url ? (
                  <img src={t.image_url} alt={t.turfname} style={{ width: '100%', height: '200px', objectFit: 'cover', borderBottom: '1px solid #e2e8f0' }} />
                ) : (
                  <div style={{ width: '100%', height: '200px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    No Image Provided
                  </div>
                )}
                <div style={{ padding: '1.5rem' }}>
                  <span className="badge">{t.type}</span>
                  <h3 style={{color: '#1a2b4c', margin: '0.5rem 0'}}>{t.turfname}</h3>
                  <p style={{color: '#64748b', marginBottom: '1rem'}}>{t.location}</p>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <strong style={{color: '#1a2b4c', fontSize: '1.2rem'}}>₹{t.priceperhour}/hr</strong>
                    <button className="btn-solid" style={{padding: '0.4rem 1rem'}}>View Slots</button>
                  </div>
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
                      <td style={{padding: '1rem'}}>{new Date(r.bookingdate).toLocaleDateString()} at {r.timeslot}</td>
                      <td style={{padding: '1rem'}}>
                        {r.status === 'Cancelled' ? (
                          <span style={{color: '#ef4444', fontSize: '0.9rem'}}>Cancelled by Admin.</span>
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
          
          <div className="card" style={{padding: '0', overflow: 'hidden'}}>
            {selectedTurf.image_url && (
              <img src={selectedTurf.image_url} alt={selectedTurf.turfname} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
            )}
            
            <div style={{padding: '2rem'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{color: '#1a2b4c', margin: '0 0 0.5rem 0'}}>Book {selectedTurf.turfname}</h2>
                  <p style={{color: '#64748b', margin: '0 0 0.5rem 0'}}>📍 {selectedTurf.location}</p>
                  {selectedTurf.contact_email && (
                    <p style={{color: '#64748b', margin: '0 0 0.5rem 0', fontSize: '0.9rem'}}>✉️ {selectedTurf.contact_email}</p>
                  )}
                </div>
                {selectedTurf.google_maps_link && (
                  <a href={selectedTurf.google_maps_link} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', textDecoration: 'none' }}>
                    View on Map 🗺️
                  </a>
                )}
              </div>

              <p style={{fontSize: '1.2rem', marginBottom: '2rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '1rem'}}>
                Rate: <strong style={{color: '#1a2b4c'}}>₹{selectedTurf.priceperhour}</strong>/hr
              </p>
              
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
        </div>
      )}

      {priceModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{color: '#1a2b4c', marginBottom: '1rem', marginTop: 0}}>Update Turf Price</h2>
            <p style={{color: '#475569', marginBottom: '1.5rem'}}>Enter the new hourly rate for this venue.</p>
            <form onSubmit={confirmPriceUpdate}>
              <input 
                type="number" 
                min="1"
                value={newPriceInput} 
                onChange={(e) => setNewPriceInput(e.target.value)} 
                style={{padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginBottom: '1.5rem', fontSize: '1.1rem'}}
                autoFocus
              />
              <div style={{display: 'flex', gap: '1rem'}}>
                <button type="button" className="btn-outline" style={{flex: 1}} onClick={() => setPriceModal({isOpen: false, turfId: null, currentPrice: ''})}>Cancel</button>
                <button type="submit" className="btn-solid" style={{flex: 1}}>Save Price</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{fontSize: '3rem', marginBottom: '1rem', textAlign: 'center'}}>⚠️</div>
            <h2 style={{color: '#1a2b4c', marginBottom: '1rem', marginTop: 0, textAlign: 'center'}}>Cancel Booking?</h2>
            <p style={{color: '#475569', fontSize: '1.1rem', lineHeight: '1.6', textAlign: 'center'}}>Are you sure you want to cancel this booking? The user will be notified and refunded automatically.</p>
            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
              <button className="btn-outline" style={{flex: 1}} onClick={() => setCancelModal({isOpen: false, bookingId: null})}>Go Back</button>
              <button className="btn-danger" style={{flex: 1, padding: '0.8rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer'}} onClick={confirmCancelBooking}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )} 

      {alertModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign: 'center'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>{alertModal.isError ? '⚠️' : '✅'}</div>
            <h2 style={{color: '#1a2b4c', marginBottom: '1rem', marginTop: 0}}>{alertModal.title}</h2>
            <p style={{color: '#475569', fontSize: '1.1rem', marginBottom: '2rem'}}>{alertModal.message}</p>
            <button className="btn-solid" style={{width: '100%'}} onClick={() => setAlertModal({isOpen: false, title: '', message: '', isError: false})}>Okay</button>
          </div>
        </div>
      )}

      {deleteTurfModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign: 'center'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🗑️</div>
            <h2 style={{color: '#1a2b4c', marginBottom: '1rem', marginTop: 0}}>Delete Venue?</h2>
            <p style={{color: '#475569', fontSize: '1.1rem', lineHeight: '1.6'}}>Are you sure you want to permanently delete <strong>{deleteTurfModal.turfName}</strong>? All associated bookings will also be removed.</p>
            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
              <button className="btn-outline" style={{flex: 1}} onClick={() => setDeleteTurfModal({isOpen: false, turfId: null, turfName: ''})}>Cancel</button>
              <button className="btn-danger" style={{flex: 1, padding: '0.8rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer'}} onClick={confirmDeleteTurf}>Delete Venue</button>
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
            <h2 style={{color: '#1a2b4c', margin: '0 0 1rem 0'}}>Payment Successful</h2>
            <div className="invoice-box">
              <div className="invoice-row"><span>Venue:</span> <strong>{selectedTurf.turfname}</strong></div>
              <div className="invoice-row"><span>Date:</span> <strong>{bookingDate}</strong></div>
              <div className="invoice-row"><span>Total:</span> <strong>₹{selectedTurf.priceperhour}</strong></div>
            </div>
            <button className="btn-solid" style={{width: '100%', marginTop: '1rem'}} onClick={closeInvoice}>
              Close Receipt
            </button>
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '1.5rem', marginTop: 'auto', borderTop: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', backgroundColor: 'white' }}>
        Connecting players to the best turf grounds. Book, play, and dominate!
      </footer>
    </div>
  );
}
export default App;