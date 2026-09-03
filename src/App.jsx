import React, { useState, useEffect } from 'react';

export default function App() {
  const [itineraries, setItineraries] = useState({});
  const [selectedTrip, setSelectedTrip] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary');
  
  // NEW: Search and Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    day: '', time: '', activity: '', location: '', notes: ''
  });

  // NEW: Load from Local Storage OR fetch the JSON
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
          localStorage.setItem('myTravelData', JSON.stringify(data)); // Save initial data
          if (Object.keys(data).length > 0) setSelectedTrip(Object.keys(data)[0]);
        });
    }
  }, []);

  // NEW: Save to Local Storage whenever itineraries change
  useEffect(() => {
    if (Object.keys(itineraries).length > 0) {
      localStorage.setItem('myTravelData', JSON.stringify(itineraries));
    }
  }, [itineraries]);

  if (!selectedTrip) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-semibold animate-pulse">✈️ Building your journey...</div>;

  let currentTripData = itineraries[selectedTrip] || [];

  // NEW: Global Search Filter
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
  const itineraryData = currentTripData.filter(item => !item.day.toLowerCase().includes('to do'));

  const groupedItinerary = itineraryData.reduce((groups, item) => {
    const day = item.day || 'Unscheduled';
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
    return groups;
  }, {});

  const getIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes('hotel') || t.includes('motel') || t.includes('airbnb')) return '🏨';
    if (t.includes('flight') || t.includes('airport') || t.includes('terminal')) return '✈️';
    if (t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('food') || t.includes('eat') || t.includes('restaurant')) return '🍽️';
    if (t.includes('drive') || t.includes('car') || t.includes('uber') || t.includes('road')) return '🚗';
    if (t.includes('train') || t.includes('station') || t.includes('rail')) return '🚆';
    if (t.includes('hike') || t.includes('park') || t.includes('canyon') || t.includes('mountain')) return '🌲';
    if (t.includes('bar') || t.includes('club') || t.includes('drink') || t.includes('party')) return '🍸';
    if (t.includes('shop') || t.includes('market') || t.includes('store')) return '🛍️';
    if (t.includes('boat') || t.includes('ferry') || t.includes('cruise')) return '⛴️';
    return '📌'; 
  };

  // NEW: Handle Form Submission
  const handleAddActivity = (e) => {
    e.preventDefault();
    const updatedTrips = { ...itineraries };
    updatedTrips[selectedTrip] = [...updatedTrips[selectedTrip], newActivity];
    setItineraries(updatedTrips);
    setIsModalOpen(false);
    setNewActivity({ day: '', time: '', activity: '', location: '', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-24">
      
      {/* Hero Cover Image */}
      <div className="relative h-64 md:h-80 w-full bg-slate-800 overflow-hidden">
        <img 
          src={`https://source.unsplash.com/1600x900/?${selectedTrip.replace(/ /g, ',')},travel`} 
          alt="Destination Cover"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-end gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2 capitalize">
              {selectedTrip.replace(/_/g, ' ')}
            </h1>
            <p className="text-gray-200 font-medium tracking-wide">
              🌍 {itineraryData.length} Planned Activities
            </p>
          </div>
          
          <select 
            className="w-full md:w-auto appearance-none bg-white/20 backdrop-blur-md border border-white/30 text-white py-2 px-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer font-medium"
            value={selectedTrip}
            onChange={(e) => {
              setSelectedTrip(e.target.value);
              setActiveTab('itinerary');
              setSearchQuery('');
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
        
        {/* NEW: Global Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 mb-6 flex items-center">
          <span className="pl-4 text-gray-400 text-xl">🔍</span>
          <input 
            type="text" 
            placeholder="Search activities, locations, or days..." 
            className="w-full p-3 outline-none text-gray-700 bg-transparent font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="pr-4 text-gray-400 hover:text-gray-600 font-bold">✕</button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-8">
          <button 
            onClick={() => setActiveTab('itinerary')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${activeTab === 'itinerary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🗺️ Route & Itinerary
          </button>
          <button 
            onClick={() => setActiveTab('todo')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex justify-center items-center gap-2 ${activeTab === 'todo' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📝 Planning & To-Dos
            {todoData.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{todoData.length}</span>}
          </button>
        </div>

        {/* ITINERARY TIMELINE */}
        {activeTab === 'itinerary' && (
          <div className="space-y-10">
            {Object.keys(groupedItinerary).map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center text-lg">{dayIndex + 1}</span>
                  {day}
                </h3>
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-5 space-y-8 pl-8 md:pl-10">
                  {groupedItinerary[day].map((item, index) => (
                    <div key={index} className="relative group">
                      <div className="absolute -left-[45px] md:-left-[54px] top-1 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xl shadow-sm z-10 group-hover:border-blue-500 group-hover:scale-110 transition-transform duration-200">
                        {getIcon(item.activity)}
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 group-hover:shadow-md transition-shadow duration-200">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                          <h4 className="text-lg font-bold text-gray-900 leading-tight pr-4">{item.activity}</h4>
                          {item.time && <span className="shrink-0 bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">{item.time}</span>}
                        </div>
                        {item.location && <div className="text-sm font-medium text-blue-600 flex items-start gap-1.5 mt-2"><span>📍</span> {item.location}</div>}
                        {item.notes && <div className="mt-3 text-sm text-gray-500 bg-white p-3 rounded-xl border border-gray-100 leading-relaxed italic">{item.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TO-DO LIST */}
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

      {/* NEW: Floating Add Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 flex items-center justify-center text-3xl font-light z-40"
      >
        +
      </button>

      {/* NEW: Add Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">Add New Activity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Day/Date *</label>
                  <input required type="text" placeholder="e.g. Day 1, Friday, To do List" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={newActivity.day} onChange={e => setNewActivity({...newActivity, day: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Time</label>
                  <input type="text" placeholder="e.g. 10:00 AM" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={newActivity.time} onChange={e => setNewActivity({...newActivity, time: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Activity *</label>
                <input required type="text" placeholder="e.g. Dinner at Bokamorra" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={newActivity.activity} onChange={e => setNewActivity({...newActivity, activity: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                <input type="text" placeholder="e.g. Split, Croatia" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={newActivity.location} onChange={e => setNewActivity({...newActivity, location: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                <textarea rows="2" placeholder="Any booking references or reminders?" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={newActivity.notes} onChange={e => setNewActivity({...newActivity, notes: e.target.value})}></textarea>
              </div>

              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors">
                Save to Itinerary
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}