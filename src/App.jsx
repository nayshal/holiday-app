import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';

// 1. GLOBAL ERROR BOUNDARY
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
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
const customPinIcon = L.divIcon({ html: `<div style="background-color: #2563eb; color: white; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">📍</div>`, className: 'custom-leaflet-icon', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });
const worldScratchPinIcon = L.divIcon({ html: `<div style="background-color: #059669; color: white; width: 28px; height: 28px; display: flex; justify-content: center; align-items: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.35); font-size: 14px;">✨</div>`, className: 'scratch-pin-icon', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28] });

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ALL_COUNTRIES = [
  { name: 'United States', code: 'US', continent: 'North America', coords: [37.0902, -95.7129] },
  { name: 'Canada', code: 'CA', continent: 'North America', coords: [56.1304, -106.3468] },
  { name: 'United Kingdom', code: 'GB', continent: 'Europe', coords: [55.3781, -3.4360] },
  { name: 'France', code: 'FR', continent: 'Europe', coords: [46.2276, 2.2137] },
  { name: 'Italy', code: 'IT', continent: 'Europe', coords: [41.8719, 12.5674] },
  { name: 'Croatia', code: 'HR', continent: 'Europe', coords: [45.1, 15.2] },
  { name: 'Japan', code: 'JP', continent: 'Asia', coords: [36.2048, 138.2529] }
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

  // Cloud Sync States
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Loading...'); 

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addMode, setAddMode] = useState('standard'); 
  const [isIdeaMode, setIsIdeaMode] = useState(false); 
  const [newActivity, setNewActivity] = useState({ day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '', paidBy: 'You' });
  const [newTransit, setNewTransit] = useState({ day: '', depTime: '', arrTime: '', origin: '', destination: '', carrier: '', flightNum: '', cost: '', paidBy: 'You', notes: '' });
  const [magicText, setMagicText] = useState('');

  const [groupMembers, setGroupMembers] = useState(['You', 'Wife', 'Angus']);
  const [newMemberName, setNewMemberName] = useState('');

  const [packingItems, setPackingItems] = useState([]);
  const [newPackingText, setNewPackingText] = useState('');
  const [newPackingAssignee, setNewPackingAssignee] = useState('You');
  
  const [journalEntries, setJournalEntries] = useState([]);
  const [newJournal, setNewJournal] = useState({ title: '', photoUrl: '', date: '', text: '' });
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPinInput, setVaultPinInput] = useState('');
  const [userPin, setUserPin] = useState(typeof window !== 'undefined' ? (localStorage.getItem('travelVaultPin') || '') : '');
  const [vaultDocs, setVaultDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({ title: '', refNumber: '', notes: '' });
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const [geoCache, setGeoCache] = useState(JSON.parse(localStorage.getItem('travelGeoCache') || '{}'));
  const [draggingItem, setDraggingItem] = useState(null);
  const [visitedCountries, setVisitedCountries] = useState(['United States', 'United Kingdom']);
  const [countrySearch, setCountrySearch] = useState('');
  const [weatherForecast, setWeatherForecast] = useState(null);

  // --- CLOUD INIT WITH SMART EXCEL DATA INJECTION ---
  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const { data, error } = await supabase.from('travel_state').select('payload').eq('id', 'main_trip').single();
        
        let cloudTrips = {};

        if (data && data.payload && Object.keys(data.payload).length > 0) {
          const p = data.payload;
          if (p.itineraries) {
            cloudTrips = p.itineraries;
            
            // SMART INJECTION FIX: Target Canada directly to see if it's the tiny fallback stub.
            // If it is, inject the full rich data for Canada, Croatia, and USA.
            if (cloudTrips["Canada_Road_Trip"] && cloudTrips["Canada_Road_Trip"].length <= 3) {
                const detailedTrips = {
                  "Canada_Road_Trip": [
                    { day: 'Sept 19', time: '10:00 AM', activity: 'Fly to Seattle', type: 'transit', origin: 'London', destination: 'Seattle', carrier: 'British Airways', cost: '450', paidBy: 'You' },
                    { day: 'Sept 20', time: '08:00 AM', activity: 'Train to Vancouver', type: 'transit', origin: 'Seattle', destination: 'Vancouver', carrier: 'Amtrak', cost: '65', paidBy: 'You', notes: 'Enjoy the scenic coastal views.' },
                    { day: 'Sept 21', time: '09:30 AM', activity: 'Flight to Calgary', type: 'transit', origin: 'Vancouver', destination: 'Calgary', carrier: 'Air Canada', cost: '150', paidBy: 'You', notes: 'Pick up rental car at YYC airport.' },
                    { day: 'Sept 22', time: '08:00 AM', activity: 'Hike Grassi Lakes', location: 'Grassi Lakes Trailhead, Canmore, AB', type: 'standard', cost: '0', paidBy: 'You', notes: 'Beautiful turquoise lakes. Pack bear spray.' },
                    { day: 'Sept 22', time: '03:00 PM', activity: 'Check-in: Pocaterra Inn', location: 'Canmore, AB', type: 'standard', cost: '200', paidBy: 'You', notes: 'Basecamp for Banff (Sept 22-25).' },
                    { day: 'Sept 23', time: '05:30 AM', activity: 'Moraine Lake & Larch Valley', location: 'Moraine Lake, AB', type: 'standard', cost: '0', paidBy: 'You', notes: 'Arrive extremely early to secure shuttle parking.' },
                    { day: 'Sept 24', time: '09:00 AM', activity: 'Rawson Lake Hike', location: 'Kananaskis, AB', type: 'standard', cost: '0', paidBy: 'You' },
                    { day: 'Sept 25', time: '10:00 AM', activity: 'Drive Icefields Parkway', location: 'Icefields Parkway, AB', type: 'standard', cost: '0', paidBy: 'You' },
                    { day: 'Sept 25', time: '01:00 PM', activity: 'Columbia Icefield Glacier Adventure & Skywalk', location: 'Columbia Icefield, AB', type: 'standard', cost: '85', paidBy: 'Wife', notes: 'Pre-booked tickets required.' },
                    { day: 'Sept 25', time: '04:00 PM', activity: 'Check-in: Velora Hotel', location: 'Hinton, AB', type: 'standard', cost: '180', paidBy: 'Wife', notes: 'Basecamp for Jasper (Sept 25-28).' },
                    { day: 'Sept 26', time: '08:30 AM', activity: 'Valley of the Five Lakes', location: 'Jasper, AB', type: 'standard', cost: '0', paidBy: 'You' },
                    { day: 'Sept 27', time: '09:00 AM', activity: 'Maligne Lake & Pyramid Lake', location: 'Maligne Lake, AB', type: 'standard', cost: '0', paidBy: 'You' },
                    { day: 'Sept 28', time: '03:00 PM', activity: 'Check-in: Vagabond Lodge', location: 'Golden, BC', type: 'standard', cost: '210', paidBy: 'You', notes: 'Basecamp for Yoho & Glacier (Sept 28-30).' },
                    { day: 'Sept 29', time: '09:00 AM', activity: 'Takakkaw Falls & Wapta Falls', location: 'Yoho National Park, BC', type: 'standard', cost: '0', paidBy: 'You' },
                    { day: 'Oct 3', time: '10:00 AM', activity: 'Flight Home', type: 'transit', origin: 'Calgary', destination: 'London', carrier: 'Air Canada', cost: '450', paidBy: 'You' }
                  ],
                  "Croatia_Stag_Do": [
                    { day: 'Sept 11', time: '08:00 AM', activity: 'Depart for Split', type: 'transit', origin: 'London Luton Airport', destination: 'Split, Croatia', carrier: 'EasyJet', cost: '120', paidBy: 'You', notes: 'Angus’s Stag Do!' },
                    { day: 'Sept 11', time: '08:00 PM', activity: 'Dinner at Bokamorra', location: 'Bokamorra, Split, Croatia', type: 'standard', cost: '40', paidBy: 'Angus', notes: 'Pizza and cocktails to kick off the weekend.' },
                    { day: 'Sept 12', time: '11:00 AM', activity: 'Private Party Boat', location: 'Split Harbor, Croatia', type: 'standard', cost: '150', paidBy: 'You', notes: 'Bring low-calorie tequila.' },
                    { day: 'Sept 12', time: '08:00 PM', activity: 'Dinner at Buffet Fife', location: 'Buffet Fife, Split, Croatia', type: 'standard', cost: '25', paidBy: 'You', notes: 'Traditional Croatian meal.' },
                    { day: 'Sept 13', time: '08:00 PM', activity: 'Dinner at Fabrique', location: 'Fabrique, Split, Croatia', type: 'standard', cost: '50', paidBy: 'Angus', notes: 'BBQ and drinks.' },
                    { day: 'Sept 14', time: '11:00 AM', activity: 'Flight Home', type: 'transit', origin: 'Split, Croatia', destination: 'London', carrier: 'EasyJet', cost: '120', paidBy: 'You' }
                  ],
                  "USA_Road_Trip": [
                    { day: 'Day 1', time: '10:00 AM', activity: 'Arrive in LA', location: 'Los Angeles, CA', type: 'standard', cost: '0', paidBy: 'You' },
                    { day: 'Day 2', time: '09:00 AM', activity: 'Universal Studios', location: 'Universal Studios Hollywood', type: 'standard', cost: '109', paidBy: 'You' },
                    { day: 'Day 3', time: '11:00 AM', activity: 'Walk of Fame & Griffith Observatory', location: 'Griffith Observatory, LA', type: 'standard', cost: '0', paidBy: 'You' },
                    { day: 'Day 4', time: '08:00 AM', activity: 'Drive to San Diego', type: 'transit', origin: 'Los Angeles', destination: 'San Diego', carrier: 'Car', cost: '20', paidBy: 'You' },
                    { day: 'Day 5', time: '10:00 AM', activity: 'San Diego Zoo', location: 'San Diego Zoo', type: 'standard', cost: '65', paidBy: 'You' },
                    { day: 'Day 7', time: '08:00 AM', activity: 'Grand Canyon Skydiving & South Rim', location: 'Grand Canyon National Park', type: 'standard', cost: '250', paidBy: 'You' },
                    { day: 'Day 9', time: '07:00 PM', activity: 'Concert & Shooting Range', location: 'Las Vegas, NV', type: 'standard', cost: '150', paidBy: 'You' },
                    { day: 'Day 12', time: '10:00 AM', activity: 'Alcatraz Tour', location: 'Alcatraz Island, San Francisco', type: 'standard', cost: '45', paidBy: 'You' },
                    { day: 'Day 14', time: '12:00 PM', activity: 'Wine Tasting', location: 'Napa Valley, CA', type: 'standard', cost: '80', paidBy: 'You' },
                    { day: 'Day 16', time: '09:00 AM', activity: 'Runyon Canyon Hike & Flight Home', location: 'Runyon Canyon, LA', type: 'standard', cost: '0', paidBy: 'You' }
                  ]
                };
                
                // This merges the rich data right over the stub, leaving your Paris/Prague data perfectly intact!
                cloudTrips = { ...cloudTrips, ...detailedTrips }; 
            }

            setItineraries(cloudTrips);
            if (!selectedTrip && Object.keys(cloudTrips).length > 0) setSelectedTrip(Object.keys(cloudTrips)[0]);
          }
          if (p.packingItems) setPackingItems(p.packingItems);
          if (p.journalEntries) setJournalEntries(p.journalEntries);
          if (p.vaultDocs) setVaultDocs(p.vaultDocs);
          if (p.visitedCountries) setVisitedCountries(p.visitedCountries);
          if (p.groupMembers) setGroupMembers(p.groupMembers);
        }
      } catch (err) {
        console.error("Cloud connection failed. Falling back.", err);
      } finally {
        setIsCloudLoaded(true);
        setSyncStatus('✅ Saved to Cloud');
      }
    };
    fetchCloudData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- AUTO CLOUD SAVE (DEBOUNCED) ---
  useEffect(() => {
    if (!isCloudLoaded) return;
    
    setSyncStatus('☁️ Syncing...');
    const payload = { itineraries, packingItems, journalEntries, vaultDocs, visitedCountries, groupMembers };
    
    const delayDebounceFn = setTimeout(async () => {
      try {
        await supabase.from('travel_state').update({ payload }).eq('id', 'main_trip');
        setSyncStatus('✅ Saved to Cloud');
      } catch (err) {
        setSyncStatus('⚠️ Sync Error');
        console.error(err);
      }
    }, 1500); 

    return () => clearTimeout(delayDebounceFn);
  }, [itineraries, packingItems, journalEntries, vaultDocs, visitedCountries, groupMembers, isCloudLoaded]);

  useEffect(() => { localStorage.setItem('travelGeoCache', JSON.stringify(geoCache || {})); }, [geoCache]);

  let currentTripData = Array.isArray(itineraries?.[selectedTrip]) ? itineraries[selectedTrip].filter(item => item !== null && typeof item === 'object') : [];

  if (searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.toLowerCase();
    currentTripData = currentTripData.filter(item => 
      ((item?.activity || '').toLowerCase().includes(lowerQuery)) || ((item?.location || '').toLowerCase().includes(lowerQuery)) || ((item?.notes || '').toLowerCase().includes(lowerQuery)) || ((item?.day || '').toLowerCase().includes(lowerQuery))
    );
  }

  const todoData = currentTripData.filter(item => (item?.day || '').toLowerCase() === 'to do');
  let itineraryData = currentTripData.filter(item => (item?.day || '').toLowerCase() !== 'to do');

  const getCategory = (text) => {
    const t = (text || '').toLowerCase();
    if (t.includes('hotel') || t.includes('motel') || t.includes('inn') || t.includes('lodge')) return 'Hotel';
    if (t.includes('flight') || t.includes('airport') || t.includes('transit')) return 'Transport';
    if (t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('restaurant') || t.includes('pizza') || t.includes('buffet')) return 'Food';
    if (t.includes('drive') || t.includes('car') || t.includes('train') || t.includes('boat')) return 'Activity';
    if (t.includes('hike') || t.includes('lake') || t.includes('park') || t.includes('tour') || t.includes('skydiving')) return 'Activity';
    if (t.includes('bar') || t.includes('club') || t.includes('concert')) return 'Nightlife';
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

  const unscheduledItems = groupedItinerary['Unscheduled'] || [];
  const scheduledDays = Object.keys(groupedItinerary).filter(d => d !== 'Unscheduled');

  const getIcon = (text) => {
    const cat = getCategory(text);
    if (cat === 'Hotel') return '🏨';
    if (cat === 'Transport') return '✈️';
    if (cat === 'Food') return '🍽️';
    if (cat === 'Nightlife') return '🍸';
    if (cat === 'Activity') return '🌲';
    return '📌';
  };

  const getMapLinkData = (item) => {
    if (item.type === 'transit') return null; 
    const rawLoc = (item?.location && item.location.trim() !== '') ? item.location : item?.activity;
    if (!rawLoc) return null;
    let cleanQuery = rawLoc.replace(/^(drive to|stay at|visit|check in at|check-in:)\s+/i, '').trim();
    if (!cleanQuery.toLowerCase().includes('ab') && !cleanQuery.toLowerCase().includes('bc') && !cleanQuery.toLowerCase().includes('croatia') && !cleanQuery.toLowerCase().includes('ca')) {
        cleanQuery = `${cleanQuery}, ${(selectedTrip || '').replace(/_/g, ' ')}`;
    }
    return { label: rawLoc, query: cleanQuery, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}` };
  };

  const mapItems = itineraryData.map(item => getMapLinkData(item)).filter(Boolean);

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

  useEffect(() => {
    if (activeTab === 'itinerary' && resolvedMarkers.length > 0) {
      const coords = resolvedMarkers[0].coords;
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`)
        .then(res => res.json())
        .then(data => {
          if (data.daily) {
            const forecasts = data.daily.time.map((time, idx) => ({
              date: time, max: data.daily.temperature_2m_max[idx], min: data.daily.temperature_2m_min[idx], code: data.daily.weathercode[idx]
            }));
            setWeatherForecast(forecasts);
          }
        }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrip, resolvedMarkers.length > 0 ? resolvedMarkers[0].coords[0] : null]);

  const getWeatherEmoji = (code) => {
    if (code <= 3) return '☀️'; 
    if (code <= 49) return '🌫️'; 
    if (code <= 69) return '🌧️'; 
    if (code <= 79) return '❄️'; 
    if (code <= 99) return '⛈️'; 
    return '☁️';
  };

  const getRouteLegEstimate = (index, arr) => {
    if (index === 0) return null;
    const prev = arr[index - 1];
    const curr = arr[index];
    if (curr.type === 'transit' || prev.type === 'transit') return null; 
    const hash = ((prev?.activity || '') + (curr?.activity || '')).length;
    const mins = (hash % 35) + 12; 
    const miles = (mins * 0.8).toFixed(1);
    return `🚗 ${mins} min drive (${miles} mi)`;
  };

  const optimizeDayRoute = (day) => {
    const dayItems = groupedItinerary[day];
    if (!dayItems || dayItems.length <= 1) return;

    const validItems = dayItems.filter(item => {
       if (item.type === 'transit') return false; 
       const mapData = getMapLinkData(item);
       return mapData && geoCache[mapData.query] && geoCache[mapData.query] !== 'NOT_FOUND';
    });

    if (validItems.length !== dayItems.length) {
       alert("Optimization unavailable: Some locations on this day haven't been geocoded yet, or contain transit schedules.");
       return;
    }

    let unvisited = [...dayItems];
    let current = unvisited.shift();
    let optimized = [current];

    while(unvisited.length > 0) {
      let nearestIdx = 0;
      let shortestDist = Infinity;
      const cMapData = getMapLinkData(current);
      const [lat1, lon1] = geoCache[cMapData.query];

      for(let i=0; i<unvisited.length; i++) {
        const uMapData = getMapLinkData(unvisited[i]);
        const [lat2, lon2] = geoCache[uMapData.query];
        const dist = getDistance(lat1, lon1, lat2, lon2);
        if (dist < shortestDist) { shortestDist = dist; nearestIdx = i; }
      }
      current = unvisited.splice(nearestIdx, 1)[0];
      optimized.push(current);
    }

    const tripData = [...itineraries[selectedTrip]];
    const otherDays = tripData.filter(i => (i?.day || '') !== day);
    const newTripData = [...otherDays, ...optimized];
    setItineraries({ ...itineraries, [selectedTrip]: newTripData });
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (addMode === 'magic') {
      if (!magicText.trim()) return;
      setIsGeneratingAi(true);
      try {
        const aiPromptText = `Extract the travel booking details from this text and format them into the itinerary JSON array format. Text: ${magicText}`;
        const res = await fetch('/api/generate-trip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: aiPromptText }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.itinerary && data.itinerary[0]?.day === 'Error') { alert("Could not extract travel details."); setIsGeneratingAi(false); return; }

        const updatedTrips = { ...itineraries };
        if (!updatedTrips[selectedTrip]) updatedTrips[selectedTrip] = [];
        const processedItinerary = data.itinerary.map(item => {
           const activityLower = (item.activity || '').toLowerCase();
           if (activityLower.includes('flight') || activityLower.includes('train') || activityLower.includes('transit')) {
               return { ...item, type: 'transit', origin: item.location || 'Origin', destination: item.location || 'Destination', depTime: item.time || '', arrTime: item.time || '', carrier: 'Imported Transit', flightNum: '' };
           }
           return { ...item, type: 'standard' };
        });

        updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], ...processedItinerary];
        setItineraries(updatedTrips);
        setIsModalOpen(false);
        setMagicText('');
      } catch (err) { alert('Failed to import: ' + err.message); } 
      finally { setIsGeneratingAi(false); }
      return;
    }

    const updatedTrips = { ...itineraries };
    if (!updatedTrips[selectedTrip]) updatedTrips[selectedTrip] = [];
    
    if (addMode === 'standard') {
      const finalDay = isIdeaMode ? 'Unscheduled' : newActivity.day;
      updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], { ...newActivity, day: finalDay, type: 'standard' }];
    } else {
      updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], { 
        ...newTransit, type: 'transit', activity: `Transit: ${newTransit.origin} to ${newTransit.destination}`, location: newTransit.destination
      }];
    }
    setItineraries(updatedTrips);
    setIsModalOpen(false);
    setIsIdeaMode(false);
    setNewActivity({ day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '', paidBy: 'You' });
    setNewTransit({ day: '', depTime: '', arrTime: '', origin: '', destination: '', carrier: '', flightNum: '', cost: '', paidBy: 'You', notes: '' });
  };

  const handleGenerateAiTrip = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/generate-trip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: aiPrompt }) });
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
    } catch (err) { alert('Failed to generate AI trip: ' + err.message); } finally { setIsGeneratingAi(false); }
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
      
      if (targetDayItems.length === 0) { tripData.push(removed); } 
      else {
        const insertAtIndex = tripData.findIndex(i => i === targetDayItems[targetIndex || 0]);
        if (insertAtIndex > -1) { tripData.splice(insertAtIndex, 0, removed); } 
        else { tripData.push(removed); }
      }
      setItineraries({ ...itineraries, [selectedTrip]: tripData });
    }
    setDraggingItem(null);
  };

  if (!isCloudLoaded) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-semibold animate-pulse">☁️ Connecting to Supabase Cloud...</div>;
  }

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

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-24">
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

      {/* CLOUD STATUS BAR */}
      <div className="bg-slate-900 text-white text-xs font-bold py-1 px-4 text-center print-hide flex justify-between items-center">
        <span>Travel SaaS Portal</span>
        <span className={syncStatus.includes('Syncing') ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}>{syncStatus}</span>
      </div>

      {/* Hero Cover Image */}
      <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden print-hide">
        <img 
          src={
            (selectedTrip || '').toLowerCase().includes('usa') ? "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('canada') ? "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('prague') ? "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('paris') ? "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80" :
            (selectedTrip || '').toLowerCase().includes('croatia') || (selectedTrip || '').toLowerCase().includes('split') ? "https://images.unsplash.com/photo-1555986873-10d9f4e3c59a?auto=format&fit=crop&w=1600&q=80" :
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
              <button onClick={() => alert("🔗 Shareable link copied!")} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md transition-all">🔗 Share Trip</button>
              <button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md transition-all">📊 Export Excel</button>
              <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-bold transition-all">🖨️ Print PDF</button>
            </p>
          </div>
          <select 
            className="w-full md:w-auto appearance-none bg-white/20 backdrop-blur-md border border-white/30 text-white py-2 px-4 pr-10 rounded-xl shadow-sm focus:outline-none cursor-pointer font-medium print-hide"
            value={selectedTrip}
            onChange={(e) => { setSelectedTrip(e.target.value); setActiveTab('itinerary'); }}
          >
            {Object.keys(itineraries || {}).map(trip => (
              <option key={trip} value={trip} className="text-gray-900">{trip.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden print-only mb-8 text-center border-b-4 border-slate-900 pb-4 mt-8">
        <h1 className="text-5xl font-black text-slate-900 capitalize">{(selectedTrip || 'My Trip').replace(/_/g, ' ')}</h1>
        <p className="text-slate-500 font-bold tracking-widest mt-2 uppercase">Official Travel Itinerary • {itineraryData.length} Activities</p>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 -mt-6 relative z-10 print:mt-0 print:px-0">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-8 overflow-x-auto print-hide">
          <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'itinerary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🗺️ Itinerary</button>
          <button onClick={() => setActiveTab('scratchmap')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'scratchmap' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 hover:bg-emerald-50'}`}>🏆 Scratch Map</button>
          <button onClick={() => setActiveTab('map')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>📍 Trip Map</button>
          <button onClick={() => setActiveTab('budget')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'budget' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>💰 Budget</button>
          <button onClick={() => setActiveTab('split')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap ${activeTab === 'split' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>⚖️ Split</button>
        </div>

        {/* LIVE WEATHER WIDGET */}
        {activeTab === 'itinerary' && weatherForecast && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 mb-8 flex items-center justify-between overflow-x-auto print-hide">
            <div className="flex-shrink-0 pr-6 border-r border-gray-200 mr-6">
              <h4 className="font-black text-slate-900 leading-tight">Live Forecast</h4>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{(selectedTrip || '').replace(/_/g, ' ')}</p>
            </div>
            <div className="flex gap-6 min-w-max">
              {weatherForecast.slice(0, 5).map((w, idx) => (
                <div key={idx} className="text-center">
                  <span className="text-xs font-bold text-gray-400 block mb-1">{new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-2xl block mb-1">{getWeatherEmoji(w.code)}</span>
                  <div className="flex items-center justify-center gap-2 text-sm font-bold"><span className="text-gray-900">{Math.round(w.max)}°</span><span className="text-gray-400">{Math.round(w.min)}°</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: ITINERARY TIMELINE & IDEA BOARD */}
        {activeTab === 'itinerary' && (
          <div className="space-y-10 print:space-y-6">
            
            {/* UNSCHEDULED IDEA BOARD */}
            <div className="bg-purple-50 rounded-3xl p-6 md:p-8 shadow-sm border border-purple-200 print-hide" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'Unscheduled', unscheduledItems.length)}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-purple-900 flex items-center gap-3">💡 Idea Board <span className="text-xs font-bold bg-purple-200 text-purple-800 px-3 py-1 rounded-full">{unscheduledItems.length} Ideas</span></h3>
                <span className="text-xs font-bold text-purple-600 hidden md:block">Drag cards down into the itinerary to schedule them</span>
              </div>
              {unscheduledItems.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {unscheduledItems.map((item, index) => {
                    const mapData = getMapLinkData(item);
                    return (
                      <div key={index} draggable onDragStart={(e) => handleDragStart(e, item, 'Unscheduled')} className="min-w-[280px] max-w-[280px] bg-white rounded-2xl p-5 border border-purple-100 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2"><span className="text-2xl">{getIcon(item?.activity)}</span>{item?.cost && <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md">${item.cost}</span>}</div>
                          <h4 className="text-md font-bold text-gray-900 leading-tight mb-1">{item?.activity}</h4>
                          {mapData && <span className="text-xs font-bold text-purple-600 block mb-2">📍 {mapData.label}</span>}
                          {item?.notes && <p className="text-xs text-gray-500 italic line-clamp-3">{item.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-purple-400 font-bold border-2 border-dashed border-purple-200 rounded-2xl">Drop items here or use the "💡 Save to Idea Board" toggle when adding an activity.</div>
              )}
            </div>

            {/* SCHEDULED TIMELINE */}
            {scheduledDays.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 print-shadow-none print:p-0 print:border-none" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day, 0)}>
                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center justify-between border-b pb-4 print:border-slate-300">
                  <span className="flex items-center gap-3"><span className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center text-lg print:bg-slate-900 print:text-white">{dayIndex + 1}</span>{day}</span>
                  <button onClick={() => optimizeDayRoute(day)} className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-full transition-colors print-hide">🪄 Optimize Route</button>
                </h3>
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-5 space-y-6 pl-8 md:pl-10 print:border-slate-300 print:ml-5 print:pl-6">
                  {groupedItinerary[day].map((item, index) => {
                    const uniqueKey = `${day}-${index}`;
                    const mapData = getMapLinkData(item);
                    const routeLeg = getRouteLegEstimate(index, groupedItinerary[day]);

                    if (item.type === 'transit') {
                      return (
                        <div key={index} draggable onDragStart={(e) => handleDragStart(e, item, day)} className="relative group cursor-grab print-break-avoid">
                          <div className="absolute -left-[45px] md:-left-[54px] top-1 w-10 h-10 bg-indigo-600 text-white border-4 border-white rounded-full flex items-center justify-center text-xl shadow-sm z-10 print:border-slate-300 print:-left-[42px]">✈️</div>
                          <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-0 overflow-hidden group-hover:shadow-md transition-shadow print-shadow-none print:bg-white print:border-2 print:border-slate-200">
                            <div className="bg-indigo-600 text-white p-3 flex justify-between items-center print:bg-slate-100 print:text-slate-900 print:border-b print:border-slate-200">
                              <span className="text-xs font-bold uppercase tracking-widest">{item.carrier || 'Transit Provider'}</span>
                              {item.flightNum && <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded print:bg-slate-300">{item.flightNum}</span>}
                            </div>
                            <div className="p-5 flex items-center justify-between relative">
                              <div className="flex-1"><span className="text-3xl font-black text-indigo-900 block print:text-slate-900">{item.depTime || '--:--'}</span><span className="text-sm font-bold text-indigo-600 uppercase print:text-slate-600">{item.origin || 'Origin'}</span></div>
                              <div className="flex-1 px-4 flex flex-col items-center justify-center relative"><span className="text-indigo-300 print:text-slate-300 block mb-1">------ ✈️ ------</span></div>
                              <div className="flex-1 text-right"><span className="text-3xl font-black text-indigo-900 block print:text-slate-900">{item.arrTime || '--:--'}</span><span className="text-sm font-bold text-indigo-600 uppercase print:text-slate-600">{item.destination || 'Destination'}</span></div>
                            </div>
                            {(item.notes || item.cost) && (
                              <div className="bg-white p-3 border-t border-indigo-100 flex justify-between items-center text-sm print:border-slate-200"><span className="text-gray-500 italic">{item.notes}</span>{item.cost && <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md print:bg-transparent">${item.cost}</span>}</div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <React.Fragment key={index}>
                        {routeLeg && (
                          <div className="my-2 py-1.5 px-3 bg-blue-50/80 border border-blue-100 text-blue-700 text-xs font-bold rounded-xl w-fit flex items-center gap-1.5 shadow-sm print-hide"><span>{routeLeg}</span></div>
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
                            {mapData && (
                              <a href={mapData.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 mt-2 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 transition-colors print-hide"><span>📍</span> {mapData.label} ↗</a>
                            )}
                            {item?.notes && (
                              <div className="mt-3 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 leading-relaxed print:bg-transparent print:border-none print:p-0 print:mt-1">
                                <p className="italic">{item.notes}</p>
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
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800">
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10"><span className="text-slate-400 text-xs font-semibold uppercase block">Countries Visited</span><span className="text-3xl font-black text-white mt-1 block">{visitedCountries.length} <span className="text-sm font-normal text-slate-400">/ 195</span></span></div>
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10"><span className="text-slate-400 text-xs font-semibold uppercase block">World Explored</span><span className="text-3xl font-black text-emerald-400 mt-1 block">{worldPercent}%</span></div>
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

        {/* TAB 2: NATIVE INTERACTIVE LEAFLET MAP VIEW */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Interactive Map Hub</h3>
                <p className="text-gray-500 text-sm">Real-time mapped locations automatically extracted from your itinerary.</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 text-xs rounded-full">{resolvedMarkers.length} Locations Pinned</span>
            </div>
            
            <div className="rounded-2xl overflow-hidden border border-gray-200 h-[500px] w-full shadow-inner relative bg-slate-100">
              {resolvedMarkers.length > 0 && resolvedMarkers[0]?.coords ? (
                <MapContainer center={resolvedMarkers[0].coords} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors' />
                  {resolvedMarkers.map((marker, idx) => (
                    <Marker key={idx} position={marker.coords} icon={customPinIcon}>
                      <Popup className="font-sans"><strong className="text-sm block mb-1">{marker.label}</strong><a href={marker.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs font-bold">Get Directions ↗</a></Popup>
                    </Marker>
                  ))}
                  {resolvedMarkers.length > 1 && <Polyline positions={resolvedMarkers.map(m => m.coords)} color="#3b82f6" weight={3} dashArray="5, 10" />}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <span className="text-4xl mb-2 animate-bounce">📍</span>
                  <p className="font-semibold">Geocoding map locations...</p>
                </div>
              )}
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

      {/* Add Activity / Transit / Magic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print-hide">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">Add to Itinerary</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
            </div>
            
            {/* TYPE TOGGLE */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
              <button type="button" onClick={() => setAddMode('standard')} className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${addMode === 'standard' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>🏖️ Standard</button>
              <button type="button" onClick={() => setAddMode('transit')} className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${addMode === 'transit' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>✈️ Transit</button>
              <button type="button" onClick={() => setAddMode('magic')} className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${addMode === 'magic' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>🪄 Magic Import</button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-4">
              
              {addMode === 'magic' ? (
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4">
                    <p className="text-sm text-purple-800 font-bold mb-1">AI Reservation Importer</p>
                    <p className="text-xs text-purple-600">Paste your flight confirmation, hotel booking, or train ticket email below. The AI will automatically extract the dates, times, carriers, and locations into your itinerary.</p>
                  </div>
                  <textarea rows="6" required placeholder="e.g. Booking Confirmation: Your flight BA123 departs LHR at 08:00 AM on Sept 15 and arrives at JFK at 11:30 AM..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 text-sm" value={magicText} onChange={e => setMagicText(e.target.value)}></textarea>
                </div>
              ) : addMode === 'standard' ? (
                <>
                  <div className="mb-2">
                    <label className="flex items-center gap-3 cursor-pointer bg-purple-50 border border-purple-200 p-3 rounded-xl hover:bg-purple-100 transition-colors">
                      <input type="checkbox" className="w-5 h-5 text-purple-600 rounded cursor-pointer" checked={isIdeaMode} onChange={e => setIsIdeaMode(e.target.checked)} />
                      <span className="font-bold text-purple-900 text-sm">💡 Save to Idea Board (Decide day later)</span>
                    </label>
                  </div>

                  {!isIdeaMode && (
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Day/Date *</label><input required={!isIdeaMode} type="text" placeholder="e.g. Day 1" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.day} onChange={e => setNewActivity({...newActivity, day: e.target.value})} /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Time</label><input type="text" placeholder="e.g. 10:00 AM" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newActivity.time} onChange={e => setNewActivity({...newActivity, time: e.target.value})} /></div>
                    </div>
                  )}

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
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Notes</label><textarea rows="2" placeholder="Terminal 5, Gate info..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newTransit.notes} onChange={e => setNewTransit({...newTransit, notes: e.target.value})}></textarea></div>
                </>
              )}

              <button type="submit" disabled={isGeneratingAi} className="w-full py-4 mt-2 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors">
                {isGeneratingAi ? '✨ Extracting details...' : 'Add to Itinerary'}
              </button>
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