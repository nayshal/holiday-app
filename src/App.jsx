import React, { useState, useEffect } from 'react';

export default function App() {
  const [itineraries, setItineraries] = useState({});
  const [selectedTrip, setSelectedTrip] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary', 'map', 'vault', 'budget', 'todo'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedNotes, setExpandedNotes] = useState({});
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: ''
  });

  // Vault states
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPinInput, setVaultPinInput] = useState('');
  const [userPin, setUserPin] = useState(localStorage.getItem('travelVaultPin') || '');
  const [vaultDocs, setVaultDocs] = useState(JSON.parse(localStorage.getItem('travelVaultDocs') || '[]'));
  const [newDoc, setNewDoc] = useState({ title: '', refNumber: '', notes: '' });
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('myTravelData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setItineraries(parsed);
      if (Object.keys(parsed).length > 0) setSelectedTrip(Object.keys(parsed)[0]);
    } else {
      fetch('/master_itinerary.json')
        .then((res) => res.json())
        .then((data) => {
          setItineraries(data);
          localStorage.setItem('myTravelData', JSON.stringify(data));
          if (Object.keys(data).length > 0) setSelectedTrip(Object.keys(data)[0]);
        });
    }
  }, []);

  useEffect(() => {
    if (Object.keys(itineraries).length > 0) {
      localStorage.setItem('myTravelData', JSON.stringify(itineraries));
    }
  }, [itineraries]);

  useEffect(() => {
    localStorage.setItem('travelVaultDocs', JSON.stringify(vaultDocs));
  }, [vaultDocs]);

  if (!selectedTrip) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-semibold animate-pulse">✈️ Building your journey...</div>;

  let currentTripData = itineraries[selectedTrip] || [];

  if (searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.toLowerCase();
    currentTripData = currentTripData.filter(item => 
      (item.activity && item.activity.toLowerCase().includes(lowerQuery)) ||
      (item.location && item.location.toLowerCase().includes(lowerQuery)) ||
      (item.notes && item.notes.toLowerCase().includes(lowerQuery)) ||
      (item.day && item.day.toLowerCase().includes(lowerQuery))
    );
  }

  const todoData = currentTripData.filter(item => item.day.toLowerCase().includes('to do'));
  let itineraryData = currentTripData.filter(item => !item.day.toLowerCase().includes('to do'));

  const getCategory = (text) => {
    const t = text.toLowerCase();
    if (t.includes('hotel') || t.includes('motel') || t.includes('airbnb')) return 'Hotel';
    if (t.includes('flight') || t.includes('airport') || t.includes('terminal')) return 'Transport';
    if (t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('food') || t.includes('eat') || t.includes('restaurant')) return 'Food';
    if (t.includes('drive') || t.includes('car') || t.includes('uber') || t.includes('road') || t.includes('train') || t.includes('station') || t.includes('bus') || t.includes('ferry')) return 'Transport';
    if (t.includes('hike') || t.includes('park') || t.includes('canyon') || t.includes('tour') || t.includes('zoo') || t.includes('museum')) return 'Activity';
    if (t.includes('bar') || t.includes('club') || t.includes('drink')) return 'Nightlife';
    return 'Other';
  };

  if (selectedCategory !== 'All') {
    itineraryData = itineraryData.filter(item => getCategory(item.activity) === selectedCategory);
  }

  const groupedItinerary = itineraryData.reduce((groups, item) => {
    const day = item.day || 'Unscheduled';
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
    return groups;
  }, {});

  const getIcon = (text) => {
    const cat = getCategory(text);
    if (cat === 'Hotel') return '🏨';
    if (cat === 'Transport') return '🚗';
    if (cat === 'Food') return '🍽️';
    if (cat === 'Nightlife') return '🍸';
    if (cat === 'Activity') return '🌲';
    return '📌';
  };

  const toggleNote = (index) => {
    setExpandedNotes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    const updatedTrips = { ...itineraries };
    updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], newActivity];
    setItineraries(updatedTrips);
    setIsModalOpen(false);
    setNewActivity({ day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '' });
  };

  // Budget calculations
  const categoryTotals = { Food: 0, Transport: 0, Hotel: 0, Activity: 0, Nightlife: 0, Other: 0 };
  let totalBudget = 0;
  (itineraries[selectedTrip] || []).forEach(item => {
    const val = parseFloat(item.cost || 0);
    if (!isNaN(val) && val > 0) {
      totalBudget += val;
      const cat = getCategory(item.activity);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
    }
  });

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itineraries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${selectedTrip}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Extract unique locations for Map view
  const mapLocations = itineraryData.filter(item => item.location).map(item => item.location);
  const primaryMapLocation = mapLocations.length > 0 ? mapLocations[0] : selectedTrip.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-24">
      
      {/* Hero Cover Image */}
      <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden">
        <img 
          src={
            selectedTrip.toLowerCase().includes('usa') ? "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80" :
            selectedTrip.toLowerCase().includes('prague') ? "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80" :
            selectedTrip.toLowerCase().includes('paris') ? "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80" :
            selectedTrip.toLowerCase().includes('milan') ? "https://images.unsplash.com/photo-1520485647539-516b3226a254?auto=format&fit=crop&w=1600&q=80" :
            selectedTrip.toLowerCase().includes('venice') ? "https://images.unsplash.com/photo-1514896856981-09c366f7cae2?auto=format&fit=crop&w=1600&q=80" :
            selectedTrip.toLowerCase().includes('thailand') ? "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80" :
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80"
          } 
          alt="Destination Cover"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2 capitalize">
              {selectedTrip.replace(/_/g, ' ')}
            </h1>
            <p className="text-gray-200 font-medium tracking-wide flex items-center gap-3 flex-wrap">
              <span>🌍 {itineraryData.length} Activities</span>
              <button onClick={exportData} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md transition-all">
                📥 Export Backup
              </button>
            </p>
          </div>
          
          <select 
            className="w-full md:w-auto appearance-none bg-white/20 backdrop-blur-md border border-white/30 text-white py-2 px-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer font-medium"
            value={selectedTrip}
            onChange={(e) => {
              setSelectedTrip(e.target.value);
              setActiveTab('itinerary');
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          >
            {Object.keys(itineraries).map(trip => (
              <option key={trip} value={trip} className="text-gray-900">
                {trip.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
        
        {/* Global Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 mb-4 flex items-center">
          <span className="pl-4 text-gray-400 text-xl">🔍</span>
          <input 
            type="text" 
            placeholder="Search activities, locations, or notes..." 
            className="w-full p-3 outline-none text-gray-700 bg-transparent font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="pr-4 text-gray-400 hover:text-gray-600 font-bold">✕</button>
          )}
        </div>

        {/* Category Filter Pills */}
        {activeTab === 'itinerary' && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
            {['All', 'Food', 'Transport', 'Hotel', 'Activity', 'Nightlife'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
              >
                {cat === 'Food' && '🍽️ '}
                {cat === 'Transport' && '🚗 '}
                {cat === 'Hotel' && '🏨 '}
                {cat === 'Activity' && '🌲 '}
                {cat === 'Nightlife' && '🍸 '}
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-8 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('itinerary')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'itinerary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🗺️ Itinerary
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📍 Map View
          </button>
          <button 
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'budget' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            💰 Budget
          </button>
          <button 
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'vault' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🔒 Vault
          </button>
          <button 
            onClick={() => setActiveTab('todo')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 flex justify-center items-center gap-1 ${activeTab === 'todo' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📝 To-Dos
            {todoData.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{todoData.length}</span>}
          </button>
        </div>

        {/* TAB 1: ITINERARY TIMELINE */}
        {activeTab === 'itinerary' && (
          <div className="space-y-10">
            {Object.keys(groupedItinerary).map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center text-lg">{dayIndex + 1}</span>
                  {day}
                </h3>
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-5 space-y-8 pl-8 md:pl-10">
                  {groupedItinerary[day].map((item, index) => {
                    const uniqueKey = `${day}-${index}`;
                    const isLongNote = item.notes && item.notes.length > 100;
                    const isExpanded = expandedNotes[uniqueKey];

                    return (
                      <div key={index} className="relative group">
                        <div className="absolute -left-[45px] md:-left-[54px] top-1 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xl shadow-sm z-10 group-hover:border-blue-500 group-hover:scale-110 transition-transform duration-200">
                          {getIcon(item.activity)}
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 group-hover:shadow-md transition-shadow duration-200">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                            <h4 className="text-lg font-bold text-gray-900 leading-tight pr-4">{item.activity}</h4>
                            <div className="flex items-center gap-2">
                              {item.cost && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">${item.cost}</span>}
                              {item.time && <span className="shrink-0 bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">{item.time}</span>}
                            </div>
                          </div>
                          
                          {/* Photo Pinning Display */}
                          {item.photo && (
                            <div className="mb-3 overflow-hidden rounded-xl h-48 border border-gray-200">
                              <img src={item.photo} alt={item.activity} className="w-full h-full object-cover" />
                            </div>
                          )}

                          {item.location && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 mt-2 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 transition-colors"
                            >
                              <span>📍</span> {item.location} ↗
                            </a>
                          )}
                          
                          {item.notes && (
                            <div className="mt-3 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 leading-relaxed">
                              <p className={!isExpanded && isLongNote ? "line-clamp-2 italic" : "italic"}>
                                {item.notes}
                              </p>
                              {isLongNote && (
                                <button 
                                  onClick={() => toggleNote(uniqueKey)} 
                                  className="text-xs font-bold text-blue-600 hover:underline mt-1 block"
                                >
                                  {isExpanded ? 'Show less ▲' : 'Read more ▼'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: INTERACTIVE MAP VIEW */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Route & Destination Map</h3>
            <p className="text-gray-500 mb-6 text-sm">Interactive routing and pins for {selectedTrip.replace(/_/g, ' ')}.</p>
            
            <div className="rounded-2xl overflow-hidden border border-gray-200 h-[450px] w-full shadow-inner relative bg-slate-100">
              <iframe
                title="Trip Route Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(primaryMapLocation)}&t=&z=11&ie=UTF8&iwloc=&output=embed`}
              ></iframe>
            </div>

            <div className="mt-6">
              <h4 className="font-bold text-gray-900 mb-3">Pinned Stops on this Trip:</h4>
              <div className="flex flex-wrap gap-2">
                {mapLocations.length > 0 ? (
                  mapLocations.map((loc, idx) => (
                    <a 
                      key={idx} 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-gray-100 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <span>📍</span> {loc}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No specific location pins found in this itinerary.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUDGET BREAKDOWN */}
        {activeTab === 'budget' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Trip Expense Dashboard</h3>
            <p className="text-gray-500 mb-8 text-sm">Track and analyze expenses across categories for {selectedTrip.replace(/_/g, ' ')}.</p>

            <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 flex justify-between items-center shadow-md">
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider font-bold block mb-1">Total Tracked Expenses</span>
                <span className="text-4xl font-black text-emerald-400">${totalBudget.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-bold block mb-1">Items Tracked</span>
                <span className="text-2xl font-bold">{Object.values(categoryTotals).filter(v => v > 0).length} Categories</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(categoryTotals).map(([cat, amount]) => {
                const percentage = totalBudget > 0 ? ((amount / totalBudget) * 100).toFixed(0) : 0;
                return (
                  <div key={cat} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-800 flex items-center gap-2">
                        {cat === 'Food' && '🍽️'}
                        {cat === 'Transport' && '🚗'}
                        {cat === 'Hotel' && '🏨'}
                        {cat === 'Activity' && '🌲'}
                        {cat === 'Nightlife' && '🍸'}
                        {cat === 'Other' && '📌'}
                        {cat}
                      </span>
                      <span className="font-black text-gray-900">${amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-400 text-right mt-1 font-semibold">{percentage}% of total</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SECURE TRAVEL DOCUMENT VAULT */}
        {activeTab === 'vault' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900">🔒 Secure Document Vault</h3>
                <p className="text-gray-500 text-sm mt-1">Encrypted storage for passports, booking references, and insurance.</p>
              </div>
              {vaultUnlocked && (
                <button 
                  onClick={() => setIsDocModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-md transition-all"
                >
                  + Add Document
                </button>
              )}
            </div>

            {!vaultUnlocked ? (
              <div className="max-w-md mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center my-8">
                <span className="text-4xl mb-3 block">🔐</span>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Vault is Locked</h4>
                <p className="text-gray-500 text-sm mb-6">Enter your PIN code to access sensitive travel documents offline.</p>
                
                {userPin === '' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 font-bold">Set a new 4-digit PIN for your vault:</p>
                    <input 
                      type="password" 
                      maxLength="4" 
                      placeholder="Enter new PIN" 
                      className="w-full text-center tracking-widest text-2xl p-3 bg-white border border-gray-300 rounded-xl outline-none"
                      value={vaultPinInput}
                      onChange={e => setVaultPinInput(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if (vaultPinInput.length >= 4) {
                          localStorage.setItem('travelVaultPin', vaultPinInput);
                          setUserPin(vaultPinInput);
                          setVaultUnlocked(true);
                        } else {
                          alert('Please enter at least 4 characters.');
                        }
                      }}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md"
                    >
                      Set PIN & Unlock Vault
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input 
                      type="password" 
                      maxLength="4" 
                      placeholder="Enter PIN" 
                      className="w-full text-center tracking-widest text-2xl p-3 bg-white border border-gray-300 rounded-xl outline-none"
                      value={vaultPinInput}
                      onChange={e => setVaultPinInput(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if (vaultPinInput === userPin) {
                          setVaultUnlocked(true);
                        } else {
                          alert('Incorrect PIN!');
                        }
                      }}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md"
                    >
                      Unlock Vault
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vaultDocs.length > 0 ? (
                    vaultDocs.map((doc, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 relative group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900 text-lg">📄 {doc.title}</h4>
                          <button 
                            onClick={() => {
                              const updated = vaultDocs.filter((_, i) => i !== idx);
                              setVaultDocs(updated);
                            }}
                            className="text-gray-400 hover:text-red-600 text-sm font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-sm font-mono bg-white p-2 rounded-lg border border-gray-200 text-blue-600 font-bold mb-2">
                          Ref: {doc.refNumber}
                        </p>
                        {doc.notes && <p className="text-sm text-gray-600 italic">{doc.notes}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-400 py-12">No documents stored in vault yet. Click "+ Add Document" above.</div>
                  )}
                </div>
                <div className="mt-8 text-center">
                  <button 
                    onClick={() => { setVaultUnlocked(false); setVaultPinInput(''); }}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    Lock Vault Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TO-DO LIST */}
        {activeTab === 'todo' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Pre-Trip Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todoData.map((item, index) => (
                <label key={index} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 mt-0.5 rounded text-blue-600" />
                  <div>
                    <span className="font-bold text-gray-900 block">{item.activity}</span>
                    {item.location && <span className="text-sm text-blue-600 font-medium block mt-1">{item.location}</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 flex items-center justify-center text-3xl font-light z-40"
      >
        +
      </button>

      {/* Add Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">Add New Activity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Day/Date *</label>
                  <input required type="text" placeholder="e.g. Day 1, Friday" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.day} onChange={e => setNewActivity({...newActivity, day: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Time</label>
                  <input type="text" placeholder="e.g. 10:00 AM" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.time} onChange={e => setNewActivity({...newActivity, time: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Activity *</label>
                <input required type="text" placeholder="e.g. Dinner at Bokamorra" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.activity} onChange={e => setNewActivity({...newActivity, activity: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <input type="text" placeholder="e.g. Split, Croatia" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.location} onChange={e => setNewActivity({...newActivity, location: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cost ($)</label>
                  <input type="number" placeholder="e.g. 45" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.cost} onChange={e => setNewActivity({...newActivity, cost: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Photo Image URL (Optional)</label>
                <input type="url" placeholder="https://images.unsplash.com/..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.photo} onChange={e => setNewActivity({...newActivity, photo: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                <textarea rows="2" placeholder="Booking references or reminders..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.notes} onChange={e => setNewActivity({...newActivity, notes: e.target.value})}></textarea>
              </div>

              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors">
                Save to Itinerary
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Add Secure Document</h2>
              <button onClick={() => setIsDocModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setVaultDocs([...vaultDocs, newDoc]);
              setNewDoc({ title: '', refNumber: '', notes: '' });
              setIsDocModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Document Title *</label>
                <input required type="text" placeholder="e.g. Flight Booking / Passport" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reference Number / Code *</label>
                <input required type="text" placeholder="e.g. AB123456" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono" value={newDoc.refNumber} onChange={e => setNewDoc({...newDoc, refNumber: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Secure Notes</label>
                <textarea rows="2" placeholder="Important details or PINs..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newDoc.notes} onChange={e => setNewDoc({...newDoc, notes: e.target.value})}></textarea>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Save to Vault</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}