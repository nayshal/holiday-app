import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 1. GLOBAL ERROR BOUNDARY (Prevents the "Blank White Screen of Death")
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center font-sans">
          <span className="text-6xl mb-4">⚠️</span>
          <h1 className="text-3xl font-black text-gray-900 mb-2">App Crashed</h1>
          <p className="text-gray-500 mb-8 max-w-md">We found corrupted data in your browser's memory (likely from an invalid AI generation). Click below to wipe the cache and restart.</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700"
          >
            🧹 Clear Data & Restart
          </button>
          <div className="mt-8 p-4 bg-red-50 text-red-800 rounded-lg text-xs font-mono text-left max-w-2xl overflow-auto">
            {this.state.error?.toString()}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom Leaflet Pin
const customPinIcon = L.divIcon({
  html: `<div style="background-color: #2563eb; color: white; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">📍</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Safe Local Storage Parser
const getLocal = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    if (!item || item === 'null' || item === 'undefined') return fallback;
    const parsed = JSON.parse(item);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (typeof fallback === 'object' && parsed === null) return fallback;
    return parsed;
  } catch (e) {
    return fallback;
  }
};

function MainApp() {
  const [itineraries, setItineraries] = useState({});
  const [selectedTrip, setSelectedTrip] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedNotes, setExpandedNotes] = useState({});
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({ day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '', paidBy: 'You' });

  const [groupMembers, setGroupMembers] = useState(['You', 'Partner']);
  const [newMemberName, setNewMemberName] = useState('');

  const [packingItems, setPackingItems] = useState(getLocal('travelPackingItems', []));
  const [newPackingText, setNewPackingText] = useState('');
  const [newPackingAssignee, setNewPackingAssignee] = useState('You');
  
  const [journalEntries, setJournalEntries] = useState(getLocal('travelJournalEntries', []));
  const [newJournal, setNewJournal] = useState({ title: '', photoUrl: '', date: '', text: '' });
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPinInput, setVaultPinInput] = useState('');
  const [userPin, setUserPin] = useState(typeof window !== 'undefined' ? (localStorage.getItem('travelVaultPin') || '') : '');
  const [vaultDocs, setVaultDocs] = useState(getLocal('travelVaultDocs', []));
  const [newDoc, setNewDoc] = useState({ title: '', refNumber: '', notes: '' });
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const [geoCache, setGeoCache] = useState(getLocal('travelGeoCache', {}));
  const [draggingItem, setDraggingItem] = useState(null);

  useEffect(() => {
    // Hard reset URL param backdoor
    if (window.location.search.includes('reset=true')) {
      localStorage.clear();
      window.location.href = '/';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sharedTripData = params.get('tripData');

    if (sharedTripData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(sharedTripData)));
        if (decoded) {
          setItineraries(decoded);
          const firstKey = Object.keys(decoded)[0];
          if (firstKey) setSelectedTrip(firstKey);
          return;
        }
      } catch (err) {
        console.error("Failed to parse shared trip data");
      }
    }

    const savedData = getLocal('myTravelData', null);
    if (savedData && Object.keys(savedData).length > 0) {
      setItineraries(savedData);
      setSelectedTrip(Object.keys(savedData)[0]);
    } else {
      fetch('/master_itinerary.json')
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setItineraries(data);
            localStorage.setItem('myTravelData', JSON.stringify(data));
            if (Object.keys(data).length > 0) setSelectedTrip(Object.keys(data)[0]);
          }
        }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (itineraries && Object.keys(itineraries).length > 0) {
      localStorage.setItem('myTravelData', JSON.stringify(itineraries));
    }
  }, [itineraries]);

  useEffect(() => {
    localStorage.setItem('travelVaultDocs', JSON.stringify(vaultDocs || []));
    localStorage.setItem('travelPackingItems', JSON.stringify(packingItems || []));
    localStorage.setItem('travelJournalEntries', JSON.stringify(journalEntries || []));
    localStorage.setItem('travelGeoCache', JSON.stringify(geoCache || {}));
  }, [vaultDocs, packingItems, journalEntries, geoCache]);

  if (!selectedTrip && (!itineraries || Object.keys(itineraries).length === 0)) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-semibold animate-pulse">✈️ Building your journey...</div>;
  }

  // Bulletproof filtering to remove bad AI generated null objects
  let currentTripData = Array.isArray(itineraries?.[selectedTrip]) 
    ? itineraries[selectedTrip].filter(item => item !== null && typeof item === 'object') 
    : [];

  if (searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.toLowerCase();
    currentTripData = currentTripData.filter(item => 
      ((item?.activity || '').toLowerCase().includes(lowerQuery)) ||
      ((item?.location || '').toLowerCase().includes(lowerQuery)) ||
      ((item?.notes || '').toLowerCase().includes(lowerQuery)) ||
      ((item?.day || '').toLowerCase().includes(lowerQuery))
    );
  }

  const todoData = currentTripData.filter(item => (item?.day || '').toLowerCase().includes('to do'));
  let itineraryData = currentTripData.filter(item => !(item?.day || '').toLowerCase().includes('to do'));

  const getCategory = (text) => {
    const t = (text || '').toLowerCase();
    if (t.includes('hotel') || t.includes('motel') || t.includes('airbnb') || t.includes('stay')) return 'Hotel';
    if (t.includes('flight') || t.includes('airport') || t.includes('terminal')) return 'Transport';
    if (t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('food') || t.includes('eat') || t.includes('restaurant') || t.includes('walmart') || t.includes('grocery') || t.includes('cafe')) return 'Food';
    if (t.includes('drive') || t.includes('car') || t.includes('uber') || t.includes('road') || t.includes('train') || t.includes('station') || t.includes('bus') || t.includes('gas')) return 'Transport';
    if (t.includes('hike') || t.includes('park') || t.includes('canyon') || t.includes('tour') || t.includes('zoo') || t.includes('museum') || t.includes('temple')) return 'Activity';
    if (t.includes('bar') || t.includes('club') || t.includes('drink')) return 'Nightlife';
    return 'Other';
  };

  if (selectedCategory !== 'All') {
    itineraryData = itineraryData.filter(item => getCategory(item?.activity) === selectedCategory);
  }

  const groupedItinerary = itineraryData.reduce((groups, item) => {
    const day = item?.day || 'Unscheduled';
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

  const findHotelAddress = () => {
    const hotelItem = currentTripData.find(item => getCategory(item?.activity) === 'Hotel' || (item?.activity || '').toLowerCase().includes('hotel'));
    if (hotelItem) {
      if (hotelItem.location && hotelItem.location.trim() !== '') return hotelItem.location;
      return hotelItem.activity;
    }
    return `${(selectedTrip || '').replace(/_/g, ' ')} hotel`;
  };

  const getMapLinkData = (item) => {
    const rawLoc = (item?.location && item.location.trim() !== '' && !(item.location || '').toLowerCase().includes('drive')) 
      ? item.location 
      : item?.activity;
    
    if (!rawLoc) return null;
    const lower = rawLoc.toLowerCase();
    const ignoreList = ['do', 'lunch and a walk', 'prep for clothes', 'chill at hotel', 'then go for dinner and relax'];
    if (ignoreList.includes(lower)) return null;

    const tripCity = (selectedTrip || '').replace(/_/g, ' ');
    const hotelAddress = findHotelAddress();

    if (rawLoc.toLowerCase().includes(' to ')) {
      const parts = rawLoc.split(/ to /i);
      let origin = parts[0].replace(/^(drive to|stay at|visit)\s+/i, '').trim();
      let dest = parts[parts.length - 1].trim();

      if (origin.toLowerCase() === 'hotel' || origin.toLowerCase() === 'motel') origin = hotelAddress;
      if (dest.toLowerCase() === 'hotel' || dest.toLowerCase() === 'motel') dest = hotelAddress;

      if (origin.toLowerCase().includes('walmart')) origin = `Walmart Supercenter, ${tripCity}`;
      if (dest.toLowerCase().includes('walmart')) dest = `Walmart Supercenter, ${tripCity}`;
      if (origin.toLowerCase().includes('target')) origin = `Target, ${tripCity}`;
      if (dest.toLowerCase().includes('target')) dest = `Target, ${tripCity}`;
      if (origin.toLowerCase().includes('costco')) origin = `Costco Wholesale, ${tripCity}`;
      if (dest.toLowerCase().includes('costco')) dest = `Costco Wholesale, ${tripCity}`;

      if (!origin.toLowerCase().includes(tripCity.toLowerCase())) origin = `${origin}, ${tripCity}`;
      if (!dest.toLowerCase().includes(tripCity.toLowerCase())) dest = `${dest}, ${tripCity}`;

      return { label: rawLoc, query: dest, url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}` };
    }

    let cleanQuery = rawLoc.replace(/^(drive to|stay at|visit|dinner at|lunch at|breakfast at|flight to|arrive at|check in at|stop at)\s+/i, '').trim();
    if (cleanQuery.toLowerCase() === 'hotel' || cleanQuery.toLowerCase() === 'motel') cleanQuery = hotelAddress;
    if (cleanQuery.toLowerCase().includes('walmart')) cleanQuery = `Walmart Supercenter, ${tripCity}`;
    if (cleanQuery.toLowerCase().includes('target')) cleanQuery = `Target, ${tripCity}`;
    if (cleanQuery.toLowerCase().includes('costco')) cleanQuery = `Costco Wholesale, ${tripCity}`;

    if (!cleanQuery.toLowerCase().includes(tripCity.toLowerCase())) cleanQuery = `${cleanQuery}, ${tripCity}`;

    return { label: rawLoc, query: cleanQuery, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}` };
  };

  const mapItems = itineraryData.map(item => getMapLinkData(item)).filter(Boolean);

  // AUTOMATIC GEOCODING ENGINE
  useEffect(() => {
    if (activeTab !== 'map') return;
    
    const locationsToFetch = [...new Set(mapItems.map(m => m?.query))].filter(q => q && geoCache[q] === undefined);
    if (locationsToFetch.length === 0) return;

    let isMounted = true;
    const fetchCoordinates = async () => {
      let currentCache = { ...geoCache };
      
      for (const loc of locationsToFetch) {
        if (!isMounted) break;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            currentCache[loc] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          } else {
            currentCache[loc] = 'NOT_FOUND';
          }
          setGeoCache({ ...currentCache });
          await new Promise(r => setTimeout(r, 1100)); 
        } catch(e) {
          console.error("Geocoding failed for:", loc, e);
        }
      }
    };
    
    fetchCoordinates();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, JSON.stringify(mapItems.map(m => m?.query))]);

  const resolvedMarkers = mapItems.map(item => ({
    ...item,
    coords: geoCache && geoCache[item?.query] && geoCache[item?.query] !== 'NOT_FOUND' ? geoCache[item?.query] : null
  })).filter(m => m && m.coords && Array.isArray(m.coords) && m.coords.length === 2 && !isNaN(m.coords[0]));

  const getRouteLegEstimate = (index, arr) => {
    if (index === 0) return null;
    const prev = arr[index - 1];
    const curr = arr[index];
    const hash = ((prev?.activity || '') + (curr?.activity || '')).length;
    const mins = (hash % 35) + 12; 
    const miles = (mins * 0.8).toFixed(1);
    return `🚗 ${mins} min drive (${miles} mi)`;
  };

  const toggleNote = (index) => {
    setExpandedNotes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    const updatedTrips = { ...itineraries };
    if (!updatedTrips[selectedTrip]) updatedTrips[selectedTrip] = [];
    updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], newActivity];
    setItineraries(updatedTrips);
    setIsModalOpen(false);
    setNewActivity({ day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '', paidBy: 'You' });
  };

  const handleGenerateAiTrip = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.itinerary && data.itinerary[0]?.day === 'Error') {
        alert(data.itinerary[0].activity);
        setIsGeneratingAi(false);
        return;
      }

      const tripName = aiPrompt.split(' ').slice(0, 3).join('_').replace(/[^a-zA-Z0-9_]/g, '') || 'AI_Trip';
      const formattedTripName = tripName.charAt(0).toUpperCase() + tripName.slice(1);

      const updated = { ...itineraries, [formattedTripName]: data.itinerary };
      setItineraries(updated);
      setSelectedTrip(formattedTripName);
      setActiveTab('itinerary');
      setAiPrompt('');
    } catch (err) {
      console.error(err);
      alert('Failed to generate AI trip: ' + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleDragStart = (e, item, day) => {
    setDraggingItem({ item, day });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetDay, targetIndex) => {
    e.preventDefault();
    if (!draggingItem) return;

    const tripData = [...(itineraries[selectedTrip] || [])];
    const sourceItemIndex = tripData.findIndex(i => i === draggingItem.item);
    
    if (sourceItemIndex > -1) {
      tripData[sourceItemIndex].day = targetDay;
      const [removed] = tripData.splice(sourceItemIndex, 1);
      
      const targetDayItems = tripData.filter(i => (i?.day || '') === targetDay);
      const insertAtIndex = tripData.findIndex(i => i === targetDayItems[targetIndex]);
      
      if (insertAtIndex > -1) {
        tripData.splice(insertAtIndex, 0, removed);
      } else {
        tripData.push(removed);
      }

      setItineraries({ ...itineraries, [selectedTrip]: tripData });
    }
    setDraggingItem(null);
  };

  const categoryTotals = { Food: 0, Transport: 0, Hotel: 0, Activity: 0, Nightlife: 0, Other: 0 };
  let totalBudget = 0;
  const memberPaidTotals = {};
  (Array.isArray(groupMembers) ? groupMembers : []).forEach(m => memberPaidTotals[m] = 0);

  currentTripData.forEach(item => {
    const val = parseFloat(item?.cost || 0);
    if (!isNaN(val) && val > 0) {
      totalBudget += val;
      const cat = getCategory(item?.activity);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;

      const payer = item?.paidBy || 'You';
      memberPaidTotals[payer] = (memberPaidTotals[payer] || 0) + val;
    }
  });

  const fairSharePerPerson = (groupMembers || []).length > 0 ? totalBudget / groupMembers.length : 0;

  const exportCSV = () => {
    const data = itineraries[selectedTrip] || [];
    let csvContent = "data:text/csv;charset=utf-8,Day,Time,Activity,Location,Cost,Paid By,Notes\n";
    
    data.forEach(item => {
      const row = [
        `"${(item?.day || '').replace(/"/g, '""')}"`,
        `"${(item?.time || '').replace(/"/g, '""')}"`,
        `"${(item?.activity || '').replace(/"/g, '""')}"`,
        `"${(item?.location || '').replace(/"/g, '""')}"`,
        `"${(item?.cost || '').replace(/"/g, '""')}"`,
        `"${(item?.paidBy || 'You').replace(/"/g, '""')}"`,
        `"${(item?.notes || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedTrip}_itinerary.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const generateShareLink = () => {
    const tripJson = JSON.stringify({ [selectedTrip]: itineraries[selectedTrip] });
    const encoded = btoa(encodeURIComponent(tripJson));
    const shareUrl = `${window.location.origin}${window.location.pathname}?tripData=${encoded}`;
    navigator.clipboard.writeText(shareUrl);
    alert('🔗 Shareable link copied!');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-24">
      <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden print:hidden">
        <img 
          src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80"
          alt="Destination Cover"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2 capitalize">
              {(selectedTrip || 'My Trip').replace(/_/g, ' ')}
            </h1>
            <p className="text-gray-200 font-medium tracking-wide flex items-center gap-3 flex-wrap">
              <span>🌍 {itineraryData.length} Activities</span>
              <button onClick={generateShareLink} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md">🔗 Share Trip</button>
              <button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md">📊 Export Excel</button>
              <button onClick={handlePrintPDF} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-bold">🖨️ Print PDF</button>
            </p>
          </div>
          <select 
            className="w-full md:w-auto appearance-none bg-white/20 backdrop-blur-md border border-white/30 text-white py-2 px-4 pr-10 rounded-xl shadow-sm focus:outline-none cursor-pointer font-medium"
            value={selectedTrip}
            onChange={(e) => {
              setSelectedTrip(e.target.value);
              setActiveTab('itinerary');
            }}
          >
            {Object.keys(itineraries || {}).map(trip => (
              <option key={trip} value={trip} className="text-gray-900">{trip.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-8 overflow-x-auto print:hidden">
          <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'itinerary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🗺️ Itinerary</button>
          <button onClick={() => setActiveTab('ai-generator')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'ai-generator' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-50'}`}>✨ AI Generator</button>
          <button onClick={() => setActiveTab('map')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>📍 Map</button>
          <button onClick={() => setActiveTab('budget')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'budget' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>💰 Budget</button>
          <button onClick={() => setActiveTab('split')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'split' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>⚖️ Split</button>
          <button onClick={() => setActiveTab('packing')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'packing' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🎒 Packing</button>
          <button onClick={() => setActiveTab('journal')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'journal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>📸 Journal</button>
          <button onClick={() => setActiveTab('vault')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'vault' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🔒 Vault</button>
        </div>

        {/* TAB 1: ITINERARY TIMELINE */}
        {activeTab === 'itinerary' && (
          <div className="space-y-10">
            {Object.keys(groupedItinerary).map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day, 0)}>
                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-3"><span className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center text-lg">{dayIndex + 1}</span>{day}</span>
                </h3>
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-5 space-y-6 pl-8 md:pl-10">
                  {groupedItinerary[day].map((item, index) => {
                    const uniqueKey = `${day}-${index}`;
                    const isLongNote = item?.notes && item.notes.length > 100;
                    const mapData = getMapLinkData(item);
                    return (
                      <React.Fragment key={index}>
                        <div draggable onDragStart={(e) => handleDragStart(e, item, day)} className="relative group cursor-grab">
                          <div className="absolute -left-[45px] md:-left-[54px] top-1 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xl shadow-sm z-10">{getIcon(item?.activity)}</div>
                          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 group-hover:shadow-md transition-shadow">
                            <h4 className="text-lg font-bold text-gray-900 leading-tight mb-2">{item?.activity}</h4>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {item?.time && <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase">{item.time}</span>}
                              {item?.cost && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">${item.cost}</span>}
                            </div>
                            {mapData && <a href={mapData.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100"><span>📍</span> {mapData.label} ↗</a>}
                            {item?.notes && <p className="mt-3 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 italic">{item.notes}</p>}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 1.5: AI TRIP GENERATOR */}
        {activeTab === 'ai-generator' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-purple-100 text-center">
            <h3 className="text-3xl font-black text-gray-900 mb-2">Gemini AI Trip Generator</h3>
            <form onSubmit={handleGenerateAiTrip} className="space-y-4 max-w-xl mx-auto mt-6">
              <textarea required rows="4" placeholder="e.g. 3 days in Tokyo exploring historic temples and modern districts..." className="w-full p-4 bg-purple-50/50 border border-purple-200 rounded-2xl outline-none" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}></textarea>
              <button type="submit" disabled={isGeneratingAi} className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-lg">{isGeneratingAi ? 'Generating...' : 'Generate AI Itinerary'}</button>
            </form>
          </div>
        )}

        {/* TAB 2: NATIVE INTERACTIVE LEAFLET MAP VIEW */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-4">Interactive Map Hub</h3>
            <div className="rounded-2xl overflow-hidden border border-gray-200 h-[500px] w-full bg-slate-100 relative z-0">
              {resolvedMarkers.length > 0 && resolvedMarkers[0]?.coords ? (
                <MapContainer center={resolvedMarkers[0].coords} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  {resolvedMarkers.map((marker, idx) => (
                    <Marker key={idx} position={marker.coords} icon={customPinIcon}>
                      <Popup><strong className="text-sm block">{marker.label}</strong><a href={marker.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs font-bold">Directions ↗</a></Popup>
                    </Marker>
                  ))}
                  {resolvedMarkers.length > 1 && <Polyline positions={resolvedMarkers.map(m => m.coords)} color="#3b82f6" weight={3} dashArray="5, 10" />}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><p className="font-semibold">Geocoding map locations...</p></div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BUDGET */}
        {activeTab === 'budget' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Trip Expense Dashboard</h3>
            <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 flex justify-between items-center shadow-md">
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-1">Total Expenses</span><span className="text-4xl font-black text-emerald-400">${totalBudget.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {/* TAB 4: SPLIT */}
        {activeTab === 'split' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Group Expense Splitter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(groupMembers || []).map((member) => {
                const paid = memberPaidTotals[member] || 0;
                const balance = paid - fairSharePerPerson;
                return (
                  <div key={member} className="p-5 rounded-2xl border border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div><span className="font-black text-lg text-gray-900 block">{member}</span></div>
                    <div className="text-right">
                      {balance >= 0 ? <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full">Owed +${balance.toFixed(2)}</span> : <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full">Owes -${Math.abs(balance).toFixed(2)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: PACKING */}
        {activeTab === 'packing' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Group Packing Checklist</h3>
            <form onSubmit={(e) => { e.preventDefault(); if (newPackingText.trim()) { setPackingItems([...packingItems, { id: Date.now(), text: newPackingText.trim(), assignedTo: newPackingAssignee, packed: false }]); setNewPackingText(''); } }} className="flex gap-2 mb-6">
              <input type="text" required placeholder="Item name..." className="p-2 border border-gray-200 rounded-xl outline-none flex-1" value={newPackingText} onChange={e => setNewPackingText(e.target.value)} />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold">Add</button>
            </form>
            <div className="space-y-3">
              {(packingItems || []).map(item => (
                <div key={item.id} className="p-4 rounded-xl border bg-gray-50 flex justify-between"><span className="font-bold">{item.text}</span><span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded-full">👤 {item.assignedTo}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: JOURNAL */}
        {activeTab === 'journal' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900">Travel Journal</h3>
              <button onClick={() => setIsJournalModalOpen(true)} className="bg-blue-600 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-md">+ Add Entry</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(journalEntries || []).map((entry, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-3xl p-6"><h4 className="font-black text-xl mb-2">{entry.title}</h4><p className="text-sm text-gray-600">{entry.text}</p></div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: VAULT */}
        {activeTab === 'vault' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Secure Document Vault</h3>
            {!vaultUnlocked ? (
              <div className="text-center py-8"><button onClick={() => setVaultUnlocked(true)} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-md">Unlock Vault</button></div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setIsDocModalOpen(true)} className="mb-4 bg-emerald-600 text-white font-bold text-sm px-4 py-2 rounded-xl">+ Add Document</button>
                {(vaultDocs || []).map((doc, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-5"><h4 className="font-bold text-lg mb-1">📄 {doc.title}</h4><p className="text-sm font-mono text-blue-600">{doc.refNumber}</p></div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Add Activity Button */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl text-3xl font-light z-40">+</button>
    </div>
  );
}

// 2. EXPORT THE WRAPPED APP
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}