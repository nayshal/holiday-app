import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 1. GLOBAL ERROR BOUNDARY
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
          <p className="text-gray-500 mb-8 max-w-md">We found corrupted data in your browser's memory. Click below to wipe the cache and restart safely.</p>
          <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700">🧹 Clear Data & Restart</button>
          <div className="mt-8 p-4 bg-red-50 text-red-800 rounded-lg text-xs font-mono text-left max-w-2xl overflow-auto">{this.state.error?.toString()}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom Leaflet Pins
const customPinIcon = L.divIcon({
  html: `<div style="background-color: #2563eb; color: white; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">📍</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const worldScratchPinIcon = L.divIcon({
  html: `<div style="background-color: #059669; color: white; width: 28px; height: 28px; display: flex; justify-content: center; align-items: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.35); font-size: 14px;">✨</div>`,
  className: 'scratch-pin-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
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
  } catch (e) { return fallback; }
};

const ALL_COUNTRIES = [
  { name: 'United States', code: 'US', continent: 'North America', coords: [37.0902, -95.7129] },
  { name: 'Canada', code: 'CA', continent: 'North America', coords: [56.1304, -106.3468] },
  { name: 'Mexico', code: 'MX', continent: 'North America', coords: [23.6345, -102.5528] },
  { name: 'United Kingdom', code: 'GB', continent: 'Europe', coords: [55.3781, -3.4360] },
  { name: 'France', code: 'FR', continent: 'Europe', coords: [46.2276, 2.2137] },
  { name: 'Italy', code: 'IT', continent: 'Europe', coords: [41.8719, 12.5674] },
  { name: 'Spain', code: 'ES', continent: 'Europe', coords: [40.4637, -3.7492] },
  { name: 'Germany', code: 'DE', continent: 'Europe', coords: [51.1657, 10.4515] },
  { name: 'Czech Republic', code: 'CZ', continent: 'Europe', coords: [49.8175, 15.4730] },
  { name: 'Croatia', code: 'HR', continent: 'Europe', coords: [45.1, 15.2] },
  { name: 'Portugal', code: 'PT', continent: 'Europe', coords: [39.3999, -8.2245] },
  { name: 'Greece', code: 'GR', continent: 'Europe', coords: [39.0742, 21.8243] },
  { name: 'Switzerland', code: 'CH', continent: 'Europe', coords: [46.8182, 8.2275] },
  { name: 'Austria', code: 'AT', continent: 'Europe', coords: [47.5162, 14.5501] },
  { name: 'Netherlands', code: 'NL', continent: 'Europe', coords: [52.1326, 5.2913] },
  { name: 'Thailand', code: 'TH', continent: 'Asia', coords: [15.8700, 100.9925] },
  { name: 'Japan', code: 'JP', continent: 'Asia', coords: [36.2048, 138.2529] },
  { name: 'Indonesia', code: 'ID', continent: 'Asia', coords: [-0.7893, 113.9213] },
  { name: 'United Arab Emirates', code: 'AE', continent: 'Asia', coords: [23.4241, 53.8478] },
  { name: 'Singapore', code: 'SG', continent: 'Asia', coords: [1.3521, 103.8198] },
  { name: 'Australia', code: 'AU', continent: 'Oceania', coords: [-25.2744, 133.7751] },
  { name: 'New Zealand', code: 'NZ', continent: 'Oceania', coords: [-40.9006, 174.8860] },
  { name: 'Egypt', code: 'EG', continent: 'Africa', coords: [26.8206, 30.8025] },
  { name: 'South Africa', code: 'ZA', continent: 'Africa', coords: [-30.5595, 22.9375] },
  { name: 'Morocco', code: 'MA', continent: 'Africa', coords: [31.7917, -7.0926] },
  { name: 'Brazil', code: 'BR', continent: 'South America', coords: [-14.2350, -51.9253] },
  { name: 'Argentina', code: 'AR', continent: 'South America', coords: [-38.4161, -63.6167] },
  { name: 'Peru', code: 'PE', continent: 'South America', coords: [-9.1900, -75.0152] }
];

function MainApp() {
  const [itineraries, setItineraries] = useState({});
  const [selectedTrip, setSelectedTrip] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedNotes, setExpandedNotes] = useState({});
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // New Add Activity Modals (Standard vs Transit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addMode, setAddMode] = useState('standard'); // 'standard' or 'transit'
  const [newActivity, setNewActivity] = useState({ day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '', paidBy: 'You' });
  const [newTransit, setNewTransit] = useState({ day: '', depTime: '', arrTime: '', origin: '', destination: '', carrier: '', flightNum: '', cost: '', paidBy: 'You', notes: '' });

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
  const [visitedCountries, setVisitedCountries] = useState(getLocal('travelVisitedCountries', ['United States', 'United Kingdom', 'France', 'Italy']));
  const [countrySearch, setCountrySearch] = useState('');

  // Weather State
  const [weatherForecast, setWeatherForecast] = useState(null);

  useEffect(() => {
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
        if (decoded) { setItineraries(decoded); const firstKey = Object.keys(decoded)[0]; if (firstKey) setSelectedTrip(firstKey); return; }
      } catch (err) { console.error("Failed to parse shared trip data"); }
    }
    const savedData = getLocal('myTravelData', null);
    if (savedData && Object.keys(savedData).length > 0) {
      setItineraries(savedData);
      setSelectedTrip(Object.keys(savedData)[0]);
    } else {
      fetch('/master_itinerary.json').then((res) => res.json()).then((data) => {
          if (data) { setItineraries(data); localStorage.setItem('myTravelData', JSON.stringify(data)); if (Object.keys(data).length > 0) setSelectedTrip(Object.keys(data)[0]); }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => { if (itineraries && Object.keys(itineraries).length > 0) localStorage.setItem('myTravelData', JSON.stringify(itineraries)); }, [itineraries]);
  useEffect(() => {
    localStorage.setItem('travelVaultDocs', JSON.stringify(vaultDocs || []));
    localStorage.setItem('travelPackingItems', JSON.stringify(packingItems || []));
    localStorage.setItem('travelJournalEntries', JSON.stringify(journalEntries || []));
    localStorage.setItem('travelGeoCache', JSON.stringify(geoCache || {}));
    localStorage.setItem('travelVisitedCountries', JSON.stringify(visitedCountries || []));
  }, [vaultDocs, packingItems, journalEntries, geoCache, visitedCountries]);

  let currentTripData = Array.isArray(itineraries?.[selectedTrip]) ? itineraries[selectedTrip].filter(item => item !== null && typeof item === 'object') : [];

  if (searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.toLowerCase();
    currentTripData = currentTripData.filter(item => 
      ((item?.activity || '').toLowerCase().includes(lowerQuery)) || ((item?.location || '').toLowerCase().includes(lowerQuery)) || ((item?.notes || '').toLowerCase().includes(lowerQuery)) || ((item?.day || '').toLowerCase().includes(lowerQuery))
    );
  }

  const todoData = currentTripData.filter(item => (item?.day || '').toLowerCase().includes('to do'));
  let itineraryData = currentTripData.filter(item => !(item?.day || '').toLowerCase().includes('to do'));

  const getCategory = (text) => {
    const t = (text || '').toLowerCase();
    if (t.includes('hotel') || t.includes('motel') || t.includes('airbnb') || t.includes('stay')) return 'Hotel';
    if (t.includes('flight') || t.includes('airport') || t.includes('terminal') || t.includes('transit')) return 'Transport';
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
    if (cat === 'Transport') return '✈️';
    if (cat === 'Food') return '🍽️';
    if (cat === 'Nightlife') return '🍸';
    if (cat === 'Activity') return '🌲';
    return '📌';
  };

  const findHotelAddress = () => {
    const hotelItem = currentTripData.find(item => getCategory(item?.activity) === 'Hotel' || (item?.activity || '').toLowerCase().includes('hotel'));
    if (hotelItem) { if (hotelItem.location && hotelItem.location.trim() !== '') return hotelItem.location; return hotelItem.activity; }
    return `${(selectedTrip || '').replace(/_/g, ' ')}`;
  };

  const getMapLinkData = (item) => {
    if (item.type === 'transit') return null; // Transits handled specifically below
    const rawLoc = (item?.location && item.location.trim() !== '' && !(item.location || '').toLowerCase().includes('drive')) ? item.location : item?.activity;
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
      if (!origin.toLowerCase().includes(tripCity.toLowerCase())) origin = `${origin}, ${tripCity}`;
      if (!dest.toLowerCase().includes(tripCity.toLowerCase())) dest = `${dest}, ${tripCity}`;
      return { label: rawLoc, query: dest, url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}` };
    }

    let cleanQuery = rawLoc.replace(/^(drive to|stay at|visit|dinner at|lunch at|breakfast at|flight to|arrive at|check in at|stop at)\s+/i, '').trim();
    if (cleanQuery.toLowerCase() === 'hotel' || cleanQuery.toLowerCase() === 'motel') cleanQuery = hotelAddress;
    if (!cleanQuery.toLowerCase().includes(tripCity.toLowerCase())) cleanQuery = `${cleanQuery}, ${tripCity}`;
    return { label: rawLoc, query: cleanQuery, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}` };
  };

  const mapItems = itineraryData.map(item => getMapLinkData(item)).filter(Boolean);

  // Auto Geocoder
  useEffect(() => {
    if (activeTab !== 'map' && activeTab !== 'itinerary') return;
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
          if (data && data.length > 0) { currentCache[loc] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]; } 
          else { currentCache[loc] = 'NOT_FOUND'; }
          setGeoCache({ ...currentCache });
          await new Promise(r => setTimeout(r, 1100)); 
        } catch(e) { console.error("Geocoding failed"); }
      }
    };
    fetchCoordinates();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, JSON.stringify(mapItems.map(m => m?.query))]);

  const resolvedMarkers = mapItems.map(item => ({
    ...item, coords: geoCache && geoCache[item?.query] && geoCache[item?.query] !== 'NOT_FOUND' ? geoCache[item?.query] : null
  })).filter(m => m && m.coords && Array.isArray(m.coords));

  // Live Weather API (Open-Meteo)
  useEffect(() => {
    if (activeTab === 'itinerary' && resolvedMarkers.length > 0) {
      const coords = resolvedMarkers[0].coords;
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`)
        .then(res => res.json())
        .then(data => {
          if (data.daily) {
            const forecasts = data.daily.time.map((time, idx) => ({
              date: time,
              max: data.daily.temperature_2m_max[idx],
              min: data.daily.temperature_2m_min[idx],
              code: data.daily.weathercode[idx]
            }));
            setWeatherForecast(forecasts);
          }
        }).catch(err => console.error("Weather API Error", err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrip, resolvedMarkers.length > 0 ? resolvedMarkers[0].coords[0] : null]);

  const getWeatherEmoji = (code) => {
    if (code <= 3) return '☀️'; // clear/partly cloudy
    if (code <= 49) return '🌫️'; // fog
    if (code <= 69) return '🌧️'; // rain
    if (code <= 79) return '❄️'; // snow
    if (code <= 99) return '⛈️'; // thunderstorm
    return '☁️';
  };

  if (!selectedTrip && (!itineraries || Object.keys(itineraries).length === 0)) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-semibold animate-pulse">✈️ Building your journey...</div>;
  }

  const getRouteLegEstimate = (index, arr) => {
    if (index === 0) return null;
    const prev = arr[index - 1];
    const curr = arr[index];
    if (curr.type === 'transit' || prev.type === 'transit') return null; // No driving legs for flights
    const hash = ((prev?.activity || '') + (curr?.activity || '')).length;
    const mins = (hash % 35) + 12; 
    const miles = (mins * 0.8).toFixed(1);
    return `🚗 ${mins} min drive (${miles} mi)`;
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    const updatedTrips = { ...itineraries };
    if (!updatedTrips[selectedTrip]) updatedTrips[selectedTrip] = [];
    
    if (addMode === 'standard') {
      updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], { ...newActivity, type: 'standard' }];
    } else {
      updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], { 
        ...newTransit, 
        type: 'transit',
        activity: `Transit: ${newTransit.origin} to ${newTransit.destination}`,
        location: newTransit.destination
      }];
    }
    
    setItineraries(updatedTrips);
    setIsModalOpen(false);
    setNewActivity({ day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '', paidBy: 'You' });
    setNewTransit({ day: '', depTime: '', arrTime: '', origin: '', destination: '', carrier: '', flightNum: '', cost: '', paidBy: 'You', notes: '' });
  };

  const handleGenerateAiTrip = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/generate-trip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.itinerary && data.itinerary[0]?.day === 'Error') { alert(data.itinerary[0].activity); setIsGeneratingAi(false); return; }

      const tripName = aiPrompt.split(' ').slice(0, 3).join('_').replace(/[^a-zA-Z0-9_]/g, '') || 'AI_Trip';
      const formattedTripName = tripName.charAt(0).toUpperCase() + tripName.slice(1);

      const updated = { ...itineraries, [formattedTripName]: data.itinerary };
      setItineraries(updated);
      setSelectedTrip(formattedTripName);
      setActiveTab('itinerary');
      setAiPrompt('');
    } catch (err) { alert('Failed to generate AI trip: ' + err.message); } 
    finally { setIsGeneratingAi(false); }
  };

  const handleDragStart = (e, item, day) => { setDraggingItem({ item, day }); };
  const handleDragOver = (e) => { e.preventDefault(); };
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
      if (insertAtIndex > -1) { tripData.splice(insertAtIndex, 0, removed); } 
      else { tripData.push(removed); }
      setItineraries({ ...itineraries, [selectedTrip]: tripData });
    }
    setDraggingItem(null);
  };

  const toggleCountryVisited = (cName) => {
    if (visitedCountries.includes(cName)) { setVisitedCountries(visitedCountries.filter(c => c !== cName)); } 
    else { setVisitedCountries([...visitedCountries, cName]); }
  };

  const totalWorldCountries = 195;
  const worldPercent = ((visitedCountries.length / totalWorldCountries) * 100).toFixed(1);
  const visitedContinents = [...new Set(ALL_COUNTRIES.filter(c => visitedCountries.includes(c.name)).map(c => c.continent))];
  
  let travelerTier = "Weekend Wanderer";
  if (visitedCountries.length >= 3) travelerTier = "Globe Trotter";
  if (visitedCountries.length >= 7) travelerTier = "Seasoned Explorer";
  if (visitedCountries.length >= 15) travelerTier = "Master Nomad";

  const scratchedMapMarkers = ALL_COUNTRIES.filter(c => visitedCountries.includes(c.name));

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
      const row = [ `"${(item?.day || '').replace(/"/g, '""')}"`, `"${(item?.time || item?.depTime || '').replace(/"/g, '""')}"`, `"${(item?.activity || '').replace(/"/g, '""')}"`, `"${(item?.location || item?.destination || '').replace(/"/g, '""')}"`, `"${(item?.cost || '').replace(/"/g, '""')}"`, `"${(item?.paidBy || 'You').replace(/"/g, '""')}"`, `"${(item?.notes || '').replace(/"/g, '""')}"` ];
      csvContent += row.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `${selectedTrip}_itinerary.csv`);
    document.body.appendChild(link); link.click(); link.remove();
  };

  const generateShareLink = () => {
    const tripJson = JSON.stringify({ [selectedTrip]: itineraries[selectedTrip] });
    const encoded = btoa(encodeURIComponent(tripJson));
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?tripData=${encoded}`);
    alert('🔗 Shareable trip link copied to clipboard!');
  };

  const handlePrintPDF = () => { window.print(); };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-24">
      {/* 🌟 PRINT CSS STYLES FOR BEAUTIFUL PDF EXPORT 🌟 */}
      <style>{`
        @media print {
          @page { margin: 15mm; size: auto; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hide { display: none !important; }
          .print-only { display: block !important; }
          .print-break-avoid { page-break-inside: avoid; break-inside: avoid; }
          .print-shadow-none { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          .print-bg-white { background-color: white !important; }
        }
      `}</style>

      {/* Hero Cover Image */}
      <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden print-hide">
        <img 
          src={
            (selectedTrip || '').toLowerCase().includes('usa') ? "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('prague') ? "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('paris') ? "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('milan') ? "https://images.unsplash.com/photo-1520485647539-516b3226a254?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('venice') ? "https://images.unsplash.com/photo-1514896856981-09c366f7cae2?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('thailand') ? "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80" :
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80"
          } 
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
              <button onClick={generateShareLink} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md transition-all">🔗 Share Trip</button>
              <button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md transition-all">📊 Export Excel</button>
              <button onClick={handlePrintPDF} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-bold transition-all">🖨️ Print PDF</button>
            </p>
          </div>
          <select 
            className="w-full md:w-auto appearance-none bg-white/20 backdrop-blur-md border border-white/30 text-white py-2 px-4 pr-10 rounded-xl shadow-sm focus:outline-none cursor-pointer font-medium print-hide"
            value={selectedTrip}
            onChange={(e) => { setSelectedTrip(e.target.value); setActiveTab('itinerary'); setSearchQuery(''); setSelectedCategory('All'); }}
          >
            {Object.keys(itineraries || {}).map(trip => (
              <option key={trip} value={trip} className="text-gray-900">{trip.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PRINT-ONLY HEADER FOR PDF */}
      <div className="hidden print-only mb-8 text-center border-b-4 border-slate-900 pb-4 mt-8">
        <h1 className="text-5xl font-black text-slate-900 capitalize">{(selectedTrip || 'My Trip').replace(/_/g, ' ')}</h1>
        <p className="text-slate-500 font-bold tracking-widest mt-2 uppercase">Official Travel Itinerary • {itineraryData.length} Activities</p>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 -mt-6 relative z-10 print:mt-0 print:px-0">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-8 overflow-x-auto print-hide">
          <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'itinerary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🗺️ Itinerary</button>
          <button onClick={() => setActiveTab('scratchmap')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'scratchmap' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 hover:bg-emerald-50'}`}>🏆 Scratch Map</button>
          <button onClick={() => setActiveTab('ai-generator')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'ai-generator' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-50'}`}>✨ AI Generator</button>
          <button onClick={() => setActiveTab('budget')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'budget' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>💰 Budget</button>
          <button onClick={() => setActiveTab('split')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'split' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>⚖️ Split</button>
          <button onClick={() => setActiveTab('packing')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'packing' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🎒 Packing</button>
          <button onClick={() => setActiveTab('vault')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'vault' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🔒 Vault</button>
        </div>

        {/* LIVE WEATHER WIDGET (Shows above itinerary) */}
        {activeTab === 'itinerary' && weatherForecast && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 mb-8 flex items-center justify-between overflow-x-auto print-hide">
            <div className="flex-shrink-0 pr-6 border-r border-gray-200 mr-6">
              <h4 className="font-black text-slate-900 leading-tight">Live Forecast</h4>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{(selectedTrip || '').replace(/_/g, ' ')}</p>
            </div>
            <div className="flex gap-6 min-w-max">
              {weatherForecast.slice(0, 5).map((w, idx) => (
                <div key={idx} className="text-center">
                  <span className="text-xs font-bold text-gray-400 block mb-1">
                    {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-2xl block mb-1">{getWeatherEmoji(w.code)}</span>
                  <div className="flex items-center justify-center gap-2 text-sm font-bold">
                    <span className="text-gray-900">{Math.round(w.max)}°</span>
                    <span className="text-gray-400">{Math.round(w.min)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: ITINERARY TIMELINE */}
        {activeTab === 'itinerary' && (
          <div className="space-y-10 print:space-y-6">
            <p className="text-xs text-gray-400 italic text-center print-hide">💡 Tip: Drag and drop cards to reorder stops within or across days.</p>
            {Object.keys(groupedItinerary).map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 print-shadow-none print:p-0 print:border-none" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day, 0)}>
                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center justify-between border-b pb-4 print:border-slate-300">
                  <span className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center text-lg print:bg-slate-900 print:text-white print:border-2 print:border-slate-900">{dayIndex + 1}</span>
                    {day}
                  </span>
                </h3>
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-5 space-y-6 pl-8 md:pl-10 print:border-slate-300 print:ml-5 print:pl-6">
                  {groupedItinerary[day].map((item, index) => {
                    const uniqueKey = `${day}-${index}`;
                    const isExpanded = expandedNotes[uniqueKey];
                    const mapData = getMapLinkData(item);
                    const routeLeg = getRouteLegEstimate(index, groupedItinerary[day]);

                    // FEATURE: DEDICATED TRANSIT BOARDING PASS CARD
                    if (item.type === 'transit') {
                      return (
                        <div key={index} draggable onDragStart={(e) => handleDragStart(e, item, day)} className="relative group cursor-grab print-break-avoid">
                          <div className="absolute -left-[45px] md:-left-[54px] top-1 w-10 h-10 bg-indigo-600 text-white border-4 border-white rounded-full flex items-center justify-center text-xl shadow-sm z-10 print:border-slate-300 print:-left-[42px]">✈️</div>
                          <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-0 overflow-hidden group-hover:shadow-md transition-shadow print-shadow-none print:bg-white print:border-2 print:border-slate-200">
                            
                            {/* Boarding Pass Header */}
                            <div className="bg-indigo-600 text-white p-3 flex justify-between items-center print:bg-slate-100 print:text-slate-900 print:border-b print:border-slate-200">
                              <span className="text-xs font-bold uppercase tracking-widest">{item.carrier || 'Transit Provider'}</span>
                              {item.flightNum && <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded print:bg-slate-300">{item.flightNum}</span>}
                            </div>
                            
                            {/* Boarding Pass Body */}
                            <div className="p-5 flex items-center justify-between relative">
                              <div className="flex-1">
                                <span className="text-3xl font-black text-indigo-900 block print:text-slate-900">{item.depTime || '--:--'}</span>
                                <span className="text-sm font-bold text-indigo-600 uppercase print:text-slate-600">{item.origin || 'Origin'}</span>
                              </div>
                              
                              <div className="flex-1 px-4 flex flex-col items-center justify-center relative">
                                <span className="text-indigo-300 print:text-slate-300 block mb-1">------ ✈️ ------</span>
                              </div>

                              <div className="flex-1 text-right">
                                <span className="text-3xl font-black text-indigo-900 block print:text-slate-900">{item.arrTime || '--:--'}</span>
                                <span className="text-sm font-bold text-indigo-600 uppercase print:text-slate-600">{item.destination || 'Destination'}</span>
                              </div>
                            </div>
                            
                            {/* Boarding Pass Footer */}
                            {(item.notes || item.cost) && (
                              <div className="bg-white p-3 border-t border-indigo-100 flex justify-between items-center text-sm print:border-slate-200">
                                <span className="text-gray-500 italic">{item.notes}</span>
                                {item.cost && <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md print:bg-transparent">${item.cost}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // STANDARD ACTIVITY CARD
                    return (
                      <React.Fragment key={index}>
                        {routeLeg && (
                          <div className="my-2 py-1.5 px-3 bg-blue-50/80 border border-blue-100 text-blue-700 text-xs font-bold rounded-xl w-fit flex items-center gap-1.5 shadow-sm print-hide">
                            <span>{routeLeg}</span>
                          </div>
                        )}
                        <div draggable onDragStart={(e) => handleDragStart(e, item, day)} className="relative group cursor-grab active:cursor-grabbing print-break-avoid">
                          <div className="absolute -left-[45px] md:-left-[54px] top-1 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xl shadow-sm z-10 group-hover:border-blue-500 transition-colors print:border-slate-300 print:-left-[42px]">{getIcon(item?.activity)}</div>
                          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 group-hover:shadow-md transition-shadow duration-200 print-bg-white print-shadow-none">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                              <h4 className="text-lg font-bold text-gray-900 leading-tight pr-4">{item?.activity}</h4>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item?.cost && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full print:border print:border-emerald-300">${item.cost} (Paid by {item.paidBy || 'You'})</span>}
                                {item?.time && <span className="shrink-0 bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide print:border print:border-gray-300">{item.time}</span>}
                              </div>
                            </div>
                            
                            {item?.photo && (
                              <div className="mb-3 overflow-hidden rounded-xl h-48 border border-gray-200 print-hide">
                                <img src={item.photo} alt={item.activity} className="w-full h-full object-cover" />
                              </div>
                            )}

                            {mapData && (
                              <a href={mapData.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 mt-2 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 transition-colors print-hide">
                                <span>📍</span> {mapData.label} ↗
                              </a>
                            )}
                            
                            {item?.notes && (
                              <div className="mt-3 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 leading-relaxed print:bg-transparent print:border-none print:p-0 print:mt-1">
                                <p className={!isExpanded && item.notes.length > 100 ? "line-clamp-2 italic print:line-clamp-none" : "italic"}>{item.notes}</p>
                                {item.notes.length > 100 && (<button onClick={() => toggleNote(uniqueKey)} className="text-xs font-bold text-blue-600 hover:underline mt-1 block print-hide">{isExpanded ? 'Show less ▲' : 'Read more ▼'}</button>)}
                              </div>
                            )}
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

        {/* TAB 1.2: SCRATCH MAP & TRAVEL STATS PROFILE */}
        {activeTab === 'scratchmap' && (
          <div className="space-y-8 print-hide">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest border border-emerald-500/30">Official Travel Passport</span>
                  <h2 className="text-3xl md:text-4xl font-black mt-3">Traveler Status: {travelerTier}</h2>
                  <p className="text-slate-400 text-sm mt-1">Personal travel resume and world exploration footprint.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800">
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10"><span className="text-slate-400 text-xs font-semibold uppercase block">Countries Visited</span><span className="text-3xl font-black text-white mt-1 block">{visitedCountries.length} <span className="text-sm font-normal text-slate-400">/ 195</span></span></div>
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10"><span className="text-slate-400 text-xs font-semibold uppercase block">World Explored</span><span className="text-3xl font-black text-emerald-400 mt-1 block">{worldPercent}%</span></div>
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10"><span className="text-slate-400 text-xs font-semibold uppercase block">Continents</span><span className="text-3xl font-black text-indigo-300 mt-1 block">{visitedContinents.length} <span className="text-sm font-normal text-slate-400">/ 7</span></span></div>
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10"><span className="text-slate-400 text-xs font-semibold uppercase block">Planned Trips</span><span className="text-3xl font-black text-white mt-1 block">{Object.keys(itineraries || {}).length}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div><h3 className="text-2xl font-black text-gray-900">Interactive World Scratch Map</h3><p className="text-gray-500 text-sm">Glow badges represent countries scratched off your travel bucket list.</p></div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">{scratchedMapMarkers.length} Countries Active</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 h-[450px] w-full bg-slate-100 relative z-0">
                <MapContainer center={[25, 0]} zoom={2} minZoom={1.5} maxZoom={5} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OSM' />
                  {scratchedMapMarkers.map((country, idx) => (
                    <Marker key={idx} position={country.coords} icon={worldScratchPinIcon}><Popup className="font-sans"><strong className="text-sm block">{country.name}</strong><span className="text-xs text-emerald-600 font-bold">✓ Explored</span></Popup></Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h3 className="text-2xl font-black text-gray-900">Scratch Pad</h3><p className="text-gray-500 text-sm">Tap any country to scratch it off.</p></div>
                <input type="text" placeholder="Filter country..." className="p-2.5 border border-gray-200 rounded-xl text-sm outline-none w-full md:w-64" value={countrySearch} onChange={e => setCountrySearch(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map((country) => {
                  const isVisited = visitedCountries.includes(country.name);
                  return (
                    <button key={country.code} onClick={() => toggleCountryVisited(country.name)} className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between font-bold text-xs ${isVisited ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}`}>
                      <span className="truncate">{country.name}</span><span className="text-sm ml-1">{isVisited ? '🏆' : '○'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.5: SECURE SERVERLESS GEMINI AI TRIP GENERATOR */}
        {activeTab === 'ai-generator' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-purple-100 print-hide">
            <div className="max-w-xl mx-auto py-6 text-center">
              <span className="text-5xl mb-4 block">✨</span>
              <h3 className="text-3xl font-black text-gray-900 mb-2">Gemini AI Trip Generator</h3>
              <p className="text-gray-500 text-sm mb-6">Enter a vacation prompt below to instantly generate a fully structured live itinerary.</p>
              <form onSubmit={handleGenerateAiTrip} className="space-y-4">
                <textarea rows="4" required placeholder="e.g., 3 days in Tokyo exploring historic temples, authentic ramen shops, and modern electronics districts..." className="w-full p-4 bg-purple-50/50 border border-purple-200 rounded-2xl outline-none focus:border-purple-600 text-gray-800 text-sm" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}></textarea>
                <button type="submit" disabled={isGeneratingAi} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-2">
                  {isGeneratingAi ? '✨ Gemini is generating your trip...' : '🚀 Generate Live AI Itinerary'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB BUDGET */}
        {activeTab === 'budget' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 print-hide">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Trip Expense Dashboard</h3>
            <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 flex justify-between items-center shadow-md">
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-1">Total Expenses</span><span className="text-4xl font-black text-emerald-400">${totalBudget.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {/* TAB SPLIT */}
        {activeTab === 'split' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 print-hide">
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

      </main>

      {/* Floating Add Activity Button */}
      <button onClick={() => { setIsModalOpen(true); setAddMode('standard'); }} className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 flex items-center justify-center text-3xl font-light z-40 print-hide">+</button>

      {/* Add Activity / Transit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print-hide">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">Add to Itinerary</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
            </div>
            
            {/* TYPE TOGGLE */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button onClick={() => setAddMode('standard')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addMode === 'standard' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>🏖️ Standard Stop</button>
              <button onClick={() => setAddMode('transit')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addMode === 'transit' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>✈️ Transit / Flight</button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-4">
              
              {addMode === 'standard' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Day/Date *</label><input required type="text" placeholder="e.g. Day 1" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.day} onChange={e => setNewActivity({...newActivity, day: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Time</label><input type="text" placeholder="e.g. 10:00 AM" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.time} onChange={e => setNewActivity({...newActivity, time: e.target.value})} /></div>
                  </div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Activity *</label><input required type="text" placeholder="e.g. Visit Museum" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.activity} onChange={e => setNewActivity({...newActivity, activity: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Location</label><input type="text" placeholder="e.g. Paris" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.location} onChange={e => setNewActivity({...newActivity, location: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Cost ($)</label><input type="number" placeholder="45" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.cost} onChange={e => setNewActivity({...newActivity, cost: e.target.value})} /></div>
                  </div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Notes</label><textarea rows="2" placeholder="Reminders..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.notes} onChange={e => setNewActivity({...newActivity, notes: e.target.value})}></textarea></div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Day/Date *</label><input required type="text" placeholder="e.g. Day 1" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newTransit.day} onChange={e => setNewTransit({...newTransit, day: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div><label className="block text-xs font-bold text-indigo-900 mb-1">Origin City/Airport *</label><input required type="text" placeholder="LHR / London" className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg outline-none" value={newTransit.origin} onChange={e => setNewTransit({...newTransit, origin: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-indigo-900 mb-1">Destination *</label><input required type="text" placeholder="JFK / New York" className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg outline-none" value={newTransit.destination} onChange={e => setNewTransit({...newTransit, destination: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-indigo-900 mb-1">Departs</label><input type="text" placeholder="08:00 AM" className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg outline-none" value={newTransit.depTime} onChange={e => setNewTransit({...newTransit, depTime: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-indigo-900 mb-1">Arrives</label><input type="text" placeholder="11:30 AM" className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg outline-none" value={newTransit.arrTime} onChange={e => setNewTransit({...newTransit, arrTime: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Carrier / Airline</label><input type="text" placeholder="e.g. British Airways" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newTransit.carrier} onChange={e => setNewTransit({...newTransit, carrier: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Flight/Train Number</label><input type="text" placeholder="BA123" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none uppercase" value={newTransit.flightNum} onChange={e => setNewTransit({...newTransit, flightNum: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Cost ($)</label><input type="number" placeholder="450" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newTransit.cost} onChange={e => setNewTransit({...newTransit, cost: e.target.value})} /></div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Paid By</label>
                      <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newTransit.paidBy} onChange={e => setNewTransit({...newTransit, paidBy: e.target.value})}>
                        {groupMembers.map(m => (<option key={m} value={m}>{m}</option>))}
                      </select>
                    </div>
                  </div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Notes</label><textarea rows="2" placeholder="Terminal 5, Gate info..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newTransit.notes} onChange={e => setNewTransit({...newTransit, notes: e.target.value})}></textarea></div>
                </>
              )}

              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors">Add to Itinerary</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}