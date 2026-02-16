// MapStack - Main Application Logic

// State
let map;
let markers = {};
let places = [];
let activePlace = null;

// Color mapping for markers
const colorMap = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    purple: '#a855f7',
    orange: '#f97316',
    yellow: '#eab308'
};

// Initialize map
function initMap() {
    try {
        // Default to Niseko, Japan
        map = L.map('map').setView([42.8050, 140.6890], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            crossOrigin: true
        }).addTo(map);
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Map initialization error:', error);
        alert('Error loading map. Please refresh the page.');
    }
}

// Geocode address to lat/lng using Nominatim (free)
async function geocodeAddress(address) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        
        throw new Error('Address not found');
    } catch (error) {
        console.error('Geocoding error:', error);
        alert('Could not find that address. Please try a different one.');
        return null;
    }
}

// Add place to map
function addPlaceToMap(place) {
    const color = colorMap[place.color] || colorMap.red;
    
    const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 12,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    // Add tooltip
    marker.bindTooltip(place.name, {
        permanent: false,
        direction: 'top'
    });
    
    // Add popup
    const popupContent = `
        <div style="min-width: 200px;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">${place.name}</h3>
            ${place.category ? `<p style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #6b7280;">${getCategoryEmoji(place.category)} ${place.category}</p>` : ''}
            ${place.notes ? `<p style="margin: 0; font-size: 0.875rem;">${place.notes}</p>` : ''}
        </div>
    `;
    marker.bindPopup(popupContent);
    
    // Click handler
    marker.on('click', () => {
        selectPlace(place.id);
    });
    
    markers[place.id] = marker;
}

// Get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        ramen: '🍜',
        onsen: '♨️',
        hotel: '🏨',
        restaurant: '🍽️',
        cafe: '☕',
        bar: '🍺',
        attraction: '🎯',
        shop: '🛍️'
    };
    return emojis[category] || '📍';
}

// Render places list
function renderPlacesList() {
    const container = document.getElementById('placesList');
    
    if (places.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📍</div>
                <p>No places yet</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">
                    Click "Add Place" to get started
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = places.map(place => `
        <div class="place-card ${activePlace === place.id ? 'active' : ''}" 
             onclick="selectPlace('${place.id}')">
            <div class="place-name">
                <span class="place-marker" style="background: ${colorMap[place.color]}"></span>
                ${place.name}
            </div>
            ${place.category ? `
                <span class="place-category">
                    ${getCategoryEmoji(place.category)} ${place.category}
                </span>
            ` : ''}
            ${place.notes ? `
                <div class="place-notes">${place.notes}</div>
            ` : ''}
            <div class="place-actions">
                <button class="secondary" onclick="event.stopPropagation(); deletePlace('${place.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Select place
function selectPlace(placeId) {
    activePlace = placeId;
    renderPlacesList();
    
    const place = places.find(p => p.id === placeId);
    if (place && markers[placeId]) {
        map.setView([place.latitude, place.longitude], 15);
        markers[placeId].openPopup();
    }
}

// Add place
async function addPlace(placeData) {
    // Geocode address
    const coords = await geocodeAddress(placeData.address);
    if (!coords) return;
    
    const place = {
        id: Date.now().toString(),
        name: placeData.name,
        address: placeData.address,
        latitude: coords.lat,
        longitude: coords.lng,
        category: placeData.category,
        color: placeData.color,
        notes: placeData.notes
    };
    
    places.push(place);
    addPlaceToMap(place);
    renderPlacesList();
    
    // Save to localStorage for now
    savePlaces();
    
    // Fit map to show all markers
    if (places.length > 1) {
        const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([coords.lat, coords.lng], 15);
    }
}

// Delete place
function deletePlace(placeId) {
    if (!confirm('Delete this place?')) return;
    
    places = places.filter(p => p.id !== placeId);
    
    if (markers[placeId]) {
        map.removeLayer(markers[placeId]);
        delete markers[placeId];
    }
    
    if (activePlace === placeId) {
        activePlace = null;
    }
    
    renderPlacesList();
    savePlaces();
}

// Save places to localStorage
function savePlaces() {
    localStorage.setItem('mapstack_places', JSON.stringify(places));
}

// Load places from localStorage
function loadPlaces() {
    const saved = localStorage.getItem('mapstack_places');
    if (saved) {
        places = JSON.parse(saved);
        places.forEach(place => addPlaceToMap(place));
        renderPlacesList();
        
        if (places.length > 0) {
            const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
}

// Modal controls
function openAddPlaceModal() {
    document.getElementById('addPlaceModal').classList.add('active');
}

function closeAddPlaceModal() {
    document.getElementById('addPlaceModal').classList.remove('active');
    document.getElementById('addPlaceForm').reset();
}

// Share collection
function shareCollection() {
    const data = {
        places: places,
        created: new Date().toISOString()
    };
    
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(jsonStr);
    const url = `${window.location.origin}${window.location.pathname}?data=${base64}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert('Shareable link copied to clipboard! 📋\n\nAnyone with this link can view your map.');
    }).catch(() => {
        prompt('Copy this link to share:', url);
    });
}

// Load shared collection
function loadSharedCollection() {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    
    if (data) {
        try {
            const jsonStr = atob(data);
            const collection = JSON.parse(jsonStr);
            
            if (collection.places && Array.isArray(collection.places)) {
                places = collection.places;
                places.forEach(place => addPlaceToMap(place));
                renderPlacesList();
                
                if (places.length > 0) {
                    const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
                
                // Update UI to indicate this is a shared collection
                document.querySelector('.collection-description').textContent = 
                    'Shared collection - Click "Add Place" to create your own';
            }
        } catch (error) {
            console.error('Failed to load shared collection:', error);
        }
    }
}

// Form submission
document.getElementById('addPlaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const placeData = {
        name: document.getElementById('placeName').value,
        address: document.getElementById('placeAddress').value,
        category: document.getElementById('placeCategory').value,
        color: document.getElementById('placeColor').value || 'red',
        notes: document.getElementById('placeNotes').value
    };
    
    closeAddPlaceModal();
    await addPlace(placeData);
});

// Close modal when clicking outside
document.getElementById('addPlaceModal').addEventListener('click', (e) => {
    if (e.target.id === 'addPlaceModal') {
        closeAddPlaceModal();
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    // Check for shared collection
    loadSharedCollection();
    
    // If no shared collection, load from localStorage
    if (places.length === 0) {
        loadPlaces();
    }
});
