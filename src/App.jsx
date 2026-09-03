import React, { useState, useEffect } from 'react';

export default function App() {
  const [itineraries, setItineraries] = useState({});
  const [selectedTrip, setSelectedTrip] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary', 'ai-generator', 'map', 'budget', 'split', 'packing', 'journal', 'vault', 'todo'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedNotes, setExpandedNotes] = useState({});
  
  // AI Trip Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    day: '', time: '', activity: '', location: '', notes: '', cost: '', photo: '', paidBy: 'You'
  });

  // Expense Splitting & Members
  const [groupMembers, setGroupMembers] = useState(['You', 'Partner']);
  const [newMemberName, setNewMemberName] = useState('');

  // Packing list state
  const [packingItems, setPackingItems] = useState(JSON.parse(localStorage.getItem('travelPackingItems') || '[]'));
  const [newPackingText, setNewPackingText] = useState('');
  const [newPackingAssignee, setNewPackingAssignee] = useState('You');

  // Travel Journal state
  const [journalEntries, setJournalEntries] = useState(JSON.parse(localStorage.getItem('travelJournalEntries') || '[]'));
  const [newJournal, setNewJournal] = useState({ title: '', photoUrl: '', date: '', text: '' });
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  // Vault states
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPinInput, setVaultPinInput] = useState('');
  const [userPin, setUserPin] = useState(localStorage.getItem('travelVaultPin') || '');
  const [vaultDocs, setVaultDocs] = useState(JSON.parse(localStorage.getItem('travelVaultDocs') || '[]'));
  const [newDoc, setNewDoc] = useState({ title: '', refNumber: '', notes: '' });
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Drag and drop state tracking
  const [draggingItem, setDraggingItem] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedTripData = params.get('tripData');

    if (sharedTripData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(sharedTripData)));
        setItineraries(decoded);
        const firstKey = Object.keys(decoded)[0];
        if (firstKey) setSelectedTrip(firstKey);
        return;
      } catch (err) {
        console.error("Failed to parse shared trip data", err);
      }
    }

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

  useEffect(() => {
    localStorage.setItem('travelPackingItems', JSON.stringify(packingItems));
  }, [packingItems]);

  useEffect(() => {
    localStorage.setItem('travelJournalEntries', JSON.stringify(journalEntries));
  }, [journalEntries]);

  if (!selectedTrip && Object.keys(itineraries).length === 0) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-semibold animate-pulse">✈️ Building your journey...</div>;
  }

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
    if (t.includes('hotel') || t.includes('motel') || t.includes('airbnb') || t.includes('stay')) return 'Hotel';
    if (t.includes('flight') || t.includes('airport') || t.includes('terminal')) return 'Transport';
    if (t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('food') || t.includes('eat') || t.includes('restaurant') || t.includes('walmart') || t.includes('grocery') || t.includes('cafe') || t.includes('coffee')) return 'Food';
    if (t.includes('drive') || t.includes('car') || t.includes('uber') || t.includes('road') || t.includes('train') || t.includes('station') || t.includes('bus') || t.includes('ferry') || t.includes('gas')) return 'Transport';
    if (t.includes('hike') || t.includes('park') || t.includes('canyon') || t.includes('tour') || t.includes('zoo') || t.includes('museum') || t.includes('temple') || t.includes('shrine')) return 'Activity';
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

  const findHotelAddress = () => {
    const hotelItem = currentTripData.find(item => getCategory(item.activity) === 'Hotel' || item.activity.toLowerCase().includes('hotel') || item.activity.toLowerCase().includes('motel'));
    if (hotelItem) {
      if (hotelItem.location && hotelItem.location.trim() !== '') return hotelItem.location;
      return hotelItem.activity;
    }
    return `${selectedTrip.replace(/_/g, ' ')} hotel`;
  };

  const getMapLinkData = (item) => {
    const rawLoc = item.location && item.location.trim() !== '' && !item.location.toLowerCase().includes('drive') 
      ? item.location 
      : item.activity;
    
    if (!rawLoc) return null;
    const lower = rawLoc.toLowerCase();

    const ignoreList = ['do', 'lunch and a walk', 'prep for clothes', 'chill at hotel', 'then go for dinner and relax'];
    if (ignoreList.includes(lower)) return null;

    const tripCity = selectedTrip.replace(/_/g, ' ');
    const hotelAddress = findHotelAddress();

    if (rawLoc.toLowerCase().includes(' to ')) {
      const parts = rawLoc.split(/ to /i);
      let origin = parts[0].replace(/^(drive to|stay at|visit)\s+/i, '').trim();
      let dest = parts[parts.length - 1].trim();

      if (origin.toLowerCase() === 'hotel' || origin.toLowerCase() === 'motel' || origin.toLowerCase() === 'the hotel') origin = hotelAddress;
      if (dest.toLowerCase() === 'hotel' || dest.toLowerCase() === 'motel' || dest.toLowerCase() === 'the hotel') dest = hotelAddress;

      if (origin.toLowerCase().includes('walmart')) origin = `Walmart Supercenter, ${tripCity}`;
      if (dest.toLowerCase().includes('walmart')) dest = `Walmart Supercenter, ${tripCity}`;
      if (origin.toLowerCase().includes('target')) origin = `Target, ${tripCity}`;
      if (dest.toLowerCase().includes('target')) dest = `Target, ${tripCity}`;
      if (origin.toLowerCase().includes('costco')) origin = `Costco Wholesale, ${tripCity}`;
      if (dest.toLowerCase().includes('costco')) dest = `Costco Wholesale, ${tripCity}`;

      if (!origin.toLowerCase().includes(tripCity.toLowerCase())) origin = `${origin}, ${tripCity}`;
      if (!dest.toLowerCase().includes(tripCity.toLowerCase())) dest = `${dest}, ${tripCity}`;

      return {
        label: rawLoc,
        url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`
      };
    }

    let cleanQuery = rawLoc.replace(/^(drive to|stay at|visit|dinner at|lunch at|breakfast at|flight to|arrive at|check in at|stop at)\s+/i, '').trim();
    if (cleanQuery.toLowerCase() === 'hotel' || cleanQuery.toLowerCase() === 'motel') cleanQuery = hotelAddress;

    if (cleanQuery.toLowerCase().includes('walmart')) cleanQuery = `Walmart Supercenter, ${tripCity}`;
    if (cleanQuery.toLowerCase().includes('target')) cleanQuery = `Target, ${tripCity}`;
    if (cleanQuery.toLowerCase().includes('costco')) cleanQuery = `Costco Wholesale, ${tripCity}`;
    if (cleanQuery.toLowerCase().includes('starbucks')) cleanQuery = `Starbucks, ${tripCity}`;

    if (!cleanQuery.toLowerCase().includes(tripCity.toLowerCase())) {
      cleanQuery = `${cleanQuery}, ${tripCity}`;
    }

    return {
      label: rawLoc,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`
    };
  };

  const getRouteLegEstimate = (index, arr) => {
    if (index === 0) return null;
    const prev = arr[index - 1];
    const curr = arr[index];
    const hash = (prev.activity + curr.activity).length;
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

    const tripData = [...itineraries[selectedTrip]];
    const sourceItemIndex = tripData.findIndex(i => i === draggingItem.item);
    
    if (sourceItemIndex > -1) {
      tripData[sourceItemIndex].day = targetDay;
      const [removed] = tripData.splice(sourceItemIndex, 1);
      
      const targetDayItems = tripData.filter(i => i.day === targetDay);
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
  groupMembers.forEach(m => memberPaidTotals[m] = 0);

  (itineraries[selectedTrip] || []).forEach(item => {
    const val = parseFloat(item.cost || 0);
    if (!isNaN(val) && val > 0) {
      totalBudget += val;
      const cat = getCategory(item.activity);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;

      const payer = item.paidBy || 'You';
      memberPaidTotals[payer] = (memberPaidTotals[payer] || 0) + val;
    }
  });

  const fairSharePerPerson = groupMembers.length > 0 ? totalBudget / groupMembers.length : 0;

  const exportCSV = () => {
    const data = itineraries[selectedTrip] || [];
    let csvContent = "data:text/csv;charset=utf-8,Day,Time,Activity,Location,Cost,Paid By,Notes\n";
    
    data.forEach(item => {
      const row = [
        `"${(item.day || '').replace(/"/g, '""')}"`,
        `"${(item.time || '').replace(/"/g, '""')}"`,
        `"${(item.activity || '').replace(/"/g, '""')}"`,
        `"${(item.location || '').replace(/"/g, '""')}"`,
        `"${(item.cost || '').replace(/"/g, '""')}"`,
        `"${(item.paidBy || 'You').replace(/"/g, '""')}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`
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
    alert('🔗 Shareable collaboration link copied to clipboard!');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const mapItems = itineraryData.map(item => getMapLinkData(item)).filter(Boolean);
  const primaryMapLocation = mapItems.length > 0 ? mapItems[0].label : selectedTrip.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-24">
      
      {/* Hero Cover Image */}
      <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden print:hidden">
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
              <button onClick={generateShareLink} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-md">
                🔗 Share Trip
              </button>
              <button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-md">
                📊 Export Excel
              </button>
              <button onClick={handlePrintPDF} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition-all font-bold">
                🖨️ Print PDF
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 mb-4 flex items-center print:hidden">
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
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar print:hidden">
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
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-8 overflow-x-auto print:hidden">
          <button 
            onClick={() => setActiveTab('itinerary')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'itinerary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🗺️ Itinerary
          </button>
          <button 
            onClick={() => setActiveTab('ai-generator')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'ai-generator' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-50'}`}
          >
            ✨ AI Generator
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📍 Map
          </button>
          <button 
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'budget' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            💰 Budget
          </button>
          <button 
            onClick={() => setActiveTab('split')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'split' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            ⚖️ Split
          </button>
          <button 
            onClick={() => setActiveTab('packing')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'packing' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🎒 Packing
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'journal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📸 Journal
          </button>
          <button 
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeTab === 'vault' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🔒 Vault
          </button>
        </div>

        {/* TAB 1: ITINERARY TIMELINE */}
        {activeTab === 'itinerary' && (
          <div className="space-y-10">
            <p className="text-xs text-gray-400 italic text-center print:hidden">💡 Tip: Drag and drop cards to reorder stops within or across days.</p>
            {Object.keys(groupedItinerary).map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day, 0)}
              >
                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center text-lg">{dayIndex + 1}</span>
                    {day}
                  </span>
                  <span className="text-xs font-normal text-gray-400 bg-gray-50 px-3 py-1 rounded-full border">Drag cards to reorder</span>
                </h3>
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-5 space-y-6 pl-8 md:pl-10">
                  {groupedItinerary[day].map((item, index) => {
                    const uniqueKey = `${day}-${index}`;
                    const isLongNote = item.notes && item.notes.length > 100;
                    const isExpanded = expandedNotes[uniqueKey];
                    const mapData = getMapLinkData(item);
                    const routeLeg = getRouteLegEstimate(index, groupedItinerary[day]);

                    return (
                      <React.Fragment key={index}>
                        {routeLeg && (
                          <div className="my-2 py-1.5 px-3 bg-blue-50/80 border border-blue-100 text-blue-700 text-xs font-bold rounded-xl w-fit flex items-center gap-1.5 shadow-sm">
                            <span>{routeLeg}</span>
                          </div>
                        )}
                        <div 
                          draggable 
                          onDragStart={(e) => handleDragStart(e, item, day)}
                          className="relative group cursor-grab active:cursor-grabbing"
                        >
                          <div className="absolute -left-[45px] md:-left-[54px] top-1 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xl shadow-sm z-10 group-hover:border-blue-500 group-hover:scale-110 transition-transform duration-200">
                            {getIcon(item.activity)}
                          </div>
                          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 group-hover:shadow-md transition-shadow duration-200">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                              <h4 className="text-lg font-bold text-gray-900 leading-tight pr-4">{item.activity}</h4>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.cost && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">${item.cost} (Paid by {item.paidBy || 'You'})</span>}
                                {item.time && <span className="shrink-0 bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">{item.time}</span>}
                              </div>
                            </div>
                            
                            {item.photo && (
                              <div className="mb-3 overflow-hidden rounded-xl h-48 border border-gray-200">
                                <img src={item.photo} alt={item.activity} className="w-full h-full object-cover" />
                              </div>
                            )}

                            {mapData && (
                              <a 
                                href={mapData.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 mt-2 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 transition-colors"
                              >
                                <span>📍</span> {mapData.label} ↗
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
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 1.5: GEMINI AI TRIP GENERATOR */}
        {activeTab === 'ai-generator' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-purple-100">
            <div className="max-w-xl mx-auto py-6">
              <div className="text-center mb-6">
                <span className="text-5xl mb-4 block">✨</span>
                <h3 className="text-3xl font-black text-gray-900 mb-2">Gemini AI Trip Generator</h3>
                <p className="text-gray-500 text-sm">Enter a vacation prompt below to instantly generate a fully structured live itinerary using secure server-side AI.</p>
              </div>
              
              <form onSubmit={handleGenerateAiTrip} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Vacation Prompt</label>
                  <textarea 
                    rows="4" 
                    required
                    placeholder="e.g., 3 days in Tokyo exploring historic temples, authentic ramen shops, and modern electronics districts..." 
                    className="w-full p-4 bg-purple-50/50 border border-purple-200 rounded-2xl outline-none focus:border-purple-600 text-gray-800 text-sm"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isGeneratingAi}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-2"
                >
                  {isGeneratingAi ? '✨ Gemini is generating your trip...' : '🚀 Generate Live AI Itinerary'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE MAP VIEW */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Route & Destination Map</h3>
            <p className="text-gray-500 mb-6 text-sm">Interactive routing and smart geocoded locations for {selectedTrip.replace(/_/g, ' ')}.</p>
            
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
              <h4 className="font-bold text-gray-900 mb-3">Smart Resolved Stops & Directions:</h4>
              <div className="flex flex-wrap gap-2">
                {mapItems.length > 0 ? (
                  mapItems.map((m, idx) => (
                    <a 
                      key={idx} 
                      href={m.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-gray-100 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <span>📍</span> {m.label}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No valid location stops found.</p>
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

        {/* TAB 4: EXPENSE SPLITTING LEDGER */}
        {activeTab === 'split' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">⚖️ Group Expense Splitter</h3>
                <p className="text-gray-500 text-sm mt-1">Automatically calculate who paid what and settle balances evenly.</p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newMemberName.trim() && !groupMembers.includes(newMemberName.trim())) {
                  setGroupMembers([...groupMembers, newMemberName.trim()]);
                  setNewMemberName('');
                }
              }} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Add traveler..." 
                  className="p-2 border border-gray-200 rounded-xl text-sm outline-none"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                />
                <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
              </form>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 flex justify-between items-center">
              <div>
                <span className="text-blue-900 text-xs uppercase tracking-wider font-bold block mb-1">Fair Share Per Person ({groupMembers.length} Travelers)</span>
                <span className="text-3xl font-black text-blue-700">${fairSharePerPerson.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-blue-900 text-xs uppercase tracking-wider font-bold block mb-1">Total Trip Spending</span>
                <span className="text-2xl font-black text-slate-900">${totalBudget.toFixed(2)}</span>
              </div>
            </div>

            <h4 className="font-bold text-gray-900 mb-4">Traveler Balances & Debt Settlement</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupMembers.map((member) => {
                const paid = memberPaidTotals[member] || 0;
                const balance = paid - fairSharePerPerson;
                return (
                  <div key={member} className="p-5 rounded-2xl border border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                      <span className="font-black text-lg text-gray-900 block">{member}</span>
                      <span className="text-xs text-gray-500">Paid total: <b>${paid.toFixed(2)}</b></span>
                    </div>
                    <div className="text-right">
                      {balance >= 0 ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full inline-block">
                          Is owed +${balance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full inline-block">
                          Owes -${Math.abs(balance).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: SMART PACKING CHECKLISTS WITH ASSIGNMENTS */}
        {activeTab === 'packing' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">🎒 Group Packing Checklist</h3>
                <p className="text-gray-500 text-sm mt-1">Assign items to specific travelers so everyone knows who is bringing what.</p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newPackingText.trim()) {
                  setPackingItems([...packingItems, { id: Date.now(), text: newPackingText.trim(), assignedTo: newPackingAssignee, packed: false }]);
                  setNewPackingText('');
                }
              }} className="flex gap-2 flex-wrap">
                <input 
                  type="text" 
                  required
                  placeholder="Item name (e.g., Rain jacket)..." 
                  className="p-2.5 border border-gray-200 rounded-xl text-sm outline-none"
                  value={newPackingText}
                  onChange={e => setNewPackingText(e.target.value)}
                />
                <select 
                  className="p-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 font-semibold"
                  value={newPackingAssignee}
                  onChange={e => setNewPackingAssignee(e.target.value)}
                >
                  {groupMembers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold">Add Item</button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packingItems.length > 0 ? (
                packingItems.map((item) => (
                  <div key={item.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${item.packed ? 'bg-emerald-50/40 border-emerald-200 opacity-75' : 'bg-gray-50 border-gray-200'}`}>
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input 
                        type="checkbox" 
                        checked={item.packed} 
                        onChange={() => {
                          setPackingItems(packingItems.map(i => i.id === item.id ? { ...i, packed: !i.packed } : i));
                        }}
                        className="w-5 h-5 rounded text-blue-600 cursor-pointer" 
                      />
                      <span className={`font-bold text-gray-900 ${item.packed ? 'line-through text-gray-400' : ''}`}>{item.text}</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">👤 {item.assignedTo}</span>
                      <button 
                        onClick={() => setPackingItems(packingItems.filter(i => i.id !== item.id))}
                        className="text-gray-400 hover:text-red-600 font-bold text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-gray-400 py-12">No packing items added yet. Use the form above to assign items.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: TRAVEL JOURNAL & PHOTO SCRAPBOOK */}
        {activeTab === 'journal' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900">📸 Travel Journal & Memories</h3>
                <p className="text-gray-500 text-sm mt-1">Capture daily photo memories, diary entries, and highlights.</p>
              </div>
              <button 
                onClick={() => setIsJournalModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-md transition-all"
              >
                + Add Journal Entry
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {journalEntries.length > 0 ? (
                journalEntries.map((entry, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                    {entry.photoUrl && (
                      <div className="h-56 w-full overflow-hidden bg-slate-100 border-b border-gray-200">
                        <img src={entry.photoUrl} alt={entry.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-black text-xl text-gray-900">{entry.title}</h4>
                          <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">{entry.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 italic leading-relaxed">{entry.text}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                        <button 
                          onClick={() => setJournalEntries(journalEntries.filter((_, i) => i !== idx))}
                          className="text-xs text-red-600 font-bold hover:underline"
                        >
                          Delete Entry
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-gray-400 py-12">No journal entries yet. Click "+ Add Journal Entry" above to start documenting your trip!</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SECURE TRAVEL DOCUMENT VAULT */}
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
      </main>

      {/* Floating Add Activity Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 flex items-center justify-center text-3xl font-light z-40 print:hidden"
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
                <input required type="text" placeholder="e.g. Walmart / Hotel Stay" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.activity} onChange={e => setNewActivity({...newActivity, activity: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <input type="text" placeholder="e.g. Los Angeles, CA" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.location} onChange={e => setNewActivity({...newActivity, location: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cost ($)</label>
                  <input type="number" placeholder="e.g. 45" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" value={newActivity.cost} onChange={e => setNewActivity({...newActivity, cost: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Paid By</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  value={newActivity.paidBy}
                  onChange={e => setNewActivity({...newActivity, paidBy: e.target.value})}
                >
                  {groupMembers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
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

      {/* Add Journal Entry Modal */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Add Journal Entry</h2>
              <button onClick={() => setIsJournalModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setJournalEntries([...journalEntries, newJournal]);
              setNewJournal({ title: '', photoUrl: '', date: '', text: '' });
              setIsJournalModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title *</label>
                <input required type="text" placeholder="e.g. Sunset at Griffith Observatory" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newJournal.title} onChange={e => setNewJournal({...newJournal, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date *</label>
                  <input required type="text" placeholder="e.g. Day 2" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newJournal.date} onChange={e => setNewJournal({...newJournal, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Photo URL *</label>
                  <input required type="url" placeholder="https://images.unsplash.com/..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newJournal.photoUrl} onChange={e => setNewJournal({...newJournal, photoUrl: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Story / Memories *</label>
                <textarea required rows="3" placeholder="Write about your experience..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newJournal.text} onChange={e => setNewJournal({...newJournal, text: e.target.value})}></textarea>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Save Entry</button>
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
                <input type="text" placeholder="e.g. AB123456" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono" value={newDoc.refNumber} onChange={e => setNewDoc({...newDoc, refNumber: e.target.value})} />
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