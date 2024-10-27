const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGlsYXNoMTAiLCJhIjoiY20ycXVjZGdiMTVkMDJpcHRyaDM5MmNyeiJ9.n7I7Lrh9mDMypyScGqArhg';
let map;
let passengerCount = 0;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let currentMarkers = [];
let currentRoute = null;
let workTimer;
let workStartTime;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set access token first
        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Check if mapboxgl is available
        if (!mapboxgl) {
            throw new Error('Mapbox GL JS is not loaded');
        }

        // Check if token is valid
        if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your-token-here')) {
            throw new Error('Invalid Mapbox access token');
        }

        // Initialize map with basic configuration
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-74.5, 40], // New York area
            zoom: 9,
            failIfMajorPerformanceCaveat: true // This will fail if the map can't be rendered properly
        });

        // Add load event handler
        map.on('load', () => {
            // Add navigation control
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            // Add click handler
            map.on('click', handleMapClick);
            console.log('Map loaded successfully');
        });

        // Add error event handler
        map.on('error', (e) => {
            console.error('Map error:', e);
            handleMapError(e);
        });

        // Initialize other components
        utils.initializeTheme();
        initializeWorkTimer();
        addPassenger();
        makePassengersDraggable();

    } catch (error) {
        console.error('Initialization error:', error);
        utils.showNotification('Error initializing application', 'error');
        handleMapError(error);
    }
});

// Simplify map controls
function addMapControls() {
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.FullscreenControl());
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
    }));
}

// Improve error handling function
function handleMapError(error) {
    console.error('Map error:', error);
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
                <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <p class="text-gray-600 dark:text-gray-300 mb-4">
                    ${error.message || 'Unable to load map. Please check your internet connection and ensure WebGL is enabled.'}
                </p>
                <div class="space-y-2">
                    <button onclick="retryMapLoad()" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center mx-auto">
                        <i class="fas fa-redo mr-2"></i>Retry Loading Map
                    </button>
                    <a href="https://get.webgl.org" 
                       target="_blank"
                       class="text-blue-500 hover:text-blue-600 text-sm block">
                        Check WebGL Support
                    </a>
                </div>
            </div>
        `;
    }
}

// Add retry function
async function retryMapLoad() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = '';
        try {
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-74.5, 40],
                zoom: 9
            });
            
            map.on('load', () => {
                map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                map.on('click', handleMapClick);
                utils.showNotification('Map loaded successfully', 'success');
            });
        } catch (error) {
            console.error('Retry failed:', error);
            utils.showNotification('Failed to load map', 'error');
            handleMapError(error);
        }
    }
}

// Improved passenger management
function addPassenger() {
    passengerCount++;
    const passengerDiv = document.createElement('div');
    passengerDiv.className = 'passenger-entry animate-slide';
    passengerDiv.id = `passenger-${passengerCount}`;

    // Update the passenger list container class
    const passengerList = document.getElementById('passengerList');
    passengerList.className = 'passenger-management';

    passengerDiv.innerHTML = `
        <div class="passenger-info">
            <div class="passenger-input-group">
                <label for="name-${passengerCount}">Passenger Name</label>
                <input type="text" 
                       id="name-${passengerCount}"
                       class="passenger-name"
                       placeholder="Enter passenger name">
            </div>
        </div>

        <div class="passenger-locations">
            <div class="location-group">
                <div class="location-label">
                    <i class="fas fa-map-marker-alt text-green-500"></i>
                    <span>Pickup Location</span>
                </div>
                <input type="text" 
                       id="pickup-${passengerCount}"
                       class="location-input"
                       placeholder="Enter pickup address">
            </div>
            <div class="location-group">
                <div class="location-label">
                    <i class="fas fa-map-pin text-red-500"></i>
                    <span>Drop-off Location</span>
                </div>
                <input type="text" 
                       id="dropoff-${passengerCount}"
                       class="location-input"
                       placeholder="Enter drop-off address">
            </div>
        </div>

        <div class="passenger-footer">
            <div class="passenger-stats">
                <div class="stat-item">
                    <i class="fas fa-road text-blue-500"></i>
                    <span>Distance:</span>
                    <span id="distance-${passengerCount}" class="stat-value">0</span>
                    <span>miles</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <i class="fas fa-dollar-sign text-green-500"></i>
                    <span>Fare: $</span>
                    <span id="cost-${passengerCount}" class="stat-value">0.00</span>
                </div>
            </div>
            <div class="passenger-actions">
                <button onclick="calculateRouteForPassenger(${passengerCount})" class="btn-calculate">
                    <i class="fas fa-route"></i>
                    <span>Calculate Route</span>
                </button>
                <button onclick="removePassenger(${passengerCount})" class="btn-remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

    document.getElementById('passengerList').appendChild(passengerDiv);
    setupAutocomplete(passengerCount);
    showAllPassengerMarkers(); // Add this line
}

// Add location autocomplete
function setupAutocomplete(passengerId) {
    if (passengerId) {
        // Setup for specific passenger
        setupInputAutocomplete(`pickup-${passengerId}`);
        setupInputAutocomplete(`dropoff-${passengerId}`);
    } else {
        // Setup for all existing passengers
        document.querySelectorAll('.location-autocomplete').forEach(input => {
            setupInputAutocomplete(input.id);
        });
    }
}

function setupInputAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    let timeoutId;
    input.addEventListener('input', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            getSuggestions(input.value, inputId);
        }, 300);
    });
}

async function getSuggestions(query, inputId) {
    if (!query) return;

    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
            `access_token=${MAPBOX_TOKEN}&` +
            `country=us&` +
            `types=address&` +
            `limit=5`
        );
        
        const data = await response.json();
        showSuggestions(data.features, inputId);
    } catch (error) {
        console.error('Error getting suggestions:', error);
    }
}

function showSuggestions(suggestions, inputId) {
    const input = document.getElementById(inputId);
    let suggestionsList = document.getElementById(`${inputId}-suggestions`);
    
    if (!suggestionsList) {
        suggestionsList = document.createElement('div');
        suggestionsList.id = `${inputId}-suggestions`;
        suggestionsList.className = 'suggestions-list';
        input.parentNode.appendChild(suggestionsList);
    }

    suggestionsList.innerHTML = suggestions.map(place => `
        <div class="suggestion-item" onclick="selectPlace('${place.place_name}', '${inputId}')">
            <i class="fas fa-map-marker-alt"></i>
            <span>${place.place_name}</span>
        </div>
    `).join('');
}

function selectPlace(placeName, inputId) {
    const input = document.getElementById(inputId);
    input.value = placeName;
    
    // Clear suggestions
    const suggestionsList = document.getElementById(`${inputId}-suggestions`);
    if (suggestionsList) {
        suggestionsList.innerHTML = '';
    }
}

// Handle map clicks for location selection
function handleMapClick(e) {
    const focusedInput = document.activeElement;
    if (focusedInput && focusedInput.classList.contains('location-autocomplete')) {
        reverseGeocode(e.lngLat, focusedInput.id);
    }
}

async function reverseGeocode(lngLat, inputId) {
    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?` +
            `access_token=${MAPBOX_TOKEN}`
        );
        
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            document.getElementById(inputId).value = data.features[0].place_name;
        }
    } catch (error) {
        console.error('Error reverse geocoding:', error);
    }
}

// Improved route calculation
async function calculateRouteForPassenger(id) {
    const pickupInput = document.getElementById(`pickup-${id}`);
    const dropoffInput = document.getElementById(`dropoff-${id}`);
    const calcButton = document.querySelector(`#passenger-${id} .btn-calculate`);
    
    if (!pickupInput.value || !dropoffInput.value) {
        utils.showNotification('Please enter both pickup and drop-off locations', 'error');
        return;
    }

    try {
        const originalContent = utils.showLoading(calcButton, 'Calculating...');
        
        const pickup = await getCoordinates(pickupInput.value);
        const dropoff = await getCoordinates(dropoffInput.value);
        
        if (!pickup || !dropoff) {
            throw new Error('Could not find one or both locations');
        }

        const routeData = await getRoute(pickup, dropoff);
        
        if (!routeData) {
            throw new Error('Could not calculate route');
        }

        // Update UI
        const distanceSpan = document.getElementById(`distance-${id}`);
        const costSpan = document.getElementById(`cost-${id}`);
        
        const distance = (routeData.distance / 1609.34).toFixed(1); // Convert meters to miles
        const cost = (distance * 1.00 / 4).toFixed(2); // $1.00 per mile divided by 4 passengers
        
        distanceSpan.textContent = distance;
        costSpan.textContent = cost;

        // Draw route and show all markers
        drawRoute(routeData.geometry);
        await showAllPassengerMarkers();
        
        // Update total and route summary
        calculateTotalCost();
        updateRouteSummary();
        
        utils.showNotification('Route calculated successfully', 'success');

    } catch (error) {
        console.error('Route calculation error:', error);
        utils.showNotification(error.message || 'Error calculating route', 'error');
    } finally {
        utils.hideLoading(calcButton, '<i class="fas fa-route"></i> Calculate Route');
    }
}

// Get coordinates from address
async function getCoordinates(address) {
    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
            `access_token=${MAPBOX_TOKEN}&limit=1`
        );
        
        const data = await response.json();
        
        if (!data.features || !data.features.length) {
            throw new Error(`Could not find location: ${address}`);
        }

        return {
            coordinates: data.features[0].center,
            placeName: data.features[0].place_name
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error(`Could not find location: ${address}`);
    }
}

// Get route between two points
async function getRoute(pickup, dropoff) {
    try {
        const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/` +
            `${pickup.coordinates[0]},${pickup.coordinates[1]};` +
            `${dropoff.coordinates[0]},${dropoff.coordinates[1]}?` +
            `steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        
        const data = await response.json();
        
        if (!data.routes || !data.routes.length) {
            throw new Error('No route found');
        }

        return {
            distance: data.routes[0].distance,
            duration: data.routes[0].duration,
            geometry: data.routes[0].geometry
        };
    } catch (error) {
        console.error('Routing error:', error);
        throw new Error('Could not calculate route');
    }
}

// Draw route on map
function drawRoute(geometry) {
    // Remove existing route layer if it exists
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
    }

    // Add new route
    map.addSource('route', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': geometry
        }
    });

    map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#3b82f6',
            'line-width': 6,
            'line-opacity': 0.75
        }
    });

    // Fit map to show entire route
    const coordinates = geometry.coordinates;
    const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

    map.fitBounds(bounds, {
        padding: 50
    });
}

// Update to show all passenger markers
async function showAllPassengerMarkers() {
    // Remove existing markers
    currentMarkers.forEach(marker => marker.remove());
    currentMarkers = [];

    const bounds = new mapboxgl.LngLatBounds();
    const passengers = document.querySelectorAll('.passenger-entry');

    for (const passenger of passengers) {
        const id = passenger.id.split('-')[1];
        const pickupInput = document.getElementById(`pickup-${id}`);
        const dropoffInput = document.getElementById(`dropoff-${id}`);

        if (pickupInput.value && dropoffInput.value) {
            try {
                const pickup = await getCoordinates(pickupInput.value);
                const dropoff = await getCoordinates(dropoffInput.value);

                // Add pickup marker
                const pickupMarker = new mapboxgl.Marker({ color: '#10B981' })
                    .setLngLat(pickup.coordinates)
                    .setPopup(new mapboxgl.Popup().setHTML(`
                        <div class="marker-popup">
                            <h4 class="font-bold">Pickup - Passenger ${id}</h4>
                            <p class="text-sm">${pickup.placeName}</p>
                        </div>
                    `))
                    .addTo(map);

                // Add dropoff marker
                const dropoffMarker = new mapboxgl.Marker({ color: '#EF4444' })
                    .setLngLat(dropoff.coordinates)
                    .setPopup(new mapboxgl.Popup().setHTML(`
                        <div class="marker-popup">
                            <h4 class="font-bold">Drop-off - Passenger ${id}</h4>
                            <p class="text-sm">${dropoff.placeName}</p>
                        </div>
                    `))
                    .addTo(map);

                currentMarkers.push(pickupMarker, dropoffMarker);

                // Extend bounds to include these points
                bounds.extend(pickup.coordinates);
                bounds.extend(dropoff.coordinates);
            } catch (error) {
                console.error(`Error showing markers for passenger ${id}:`, error);
            }
        }
    }

    // Fit map to show all markers if there are any
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
            padding: 50
        });
    }
}

// Calculate total cost
function calculateTotalCost() {
    let totalDistance = 0;
    let totalRevenue = 0;

    document.querySelectorAll('[id^="distance-"]').forEach(element => {
        totalDistance += parseFloat(element.textContent) || 0;
    });

    document.querySelectorAll('[id^="cost-"]').forEach(element => {
        totalRevenue += parseFloat(element.textContent) || 0;
    });

    document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
    document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
}

// Add this function to handle cleanup when leaving the page
window.addEventListener('beforeunload', function() {
    if (map) {
        map.remove();
    }
});

// Add route markers
function addRouteMarkers(pickup, dropoff) {
    // Remove existing markers
    currentMarkers.forEach(marker => marker.remove());
    currentMarkers = [];

    // Add pickup marker
    const pickupMarker = new mapboxgl.Marker({ color: '#10B981' }) // Green color
        .setLngLat(pickup.coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="marker-popup">
                <h4 class="font-bold">Pickup</h4>
                <p class="text-sm">${pickup.placeName}</p>
            </div>
        `))
        .addTo(map);

    // Add dropoff marker
    const dropoffMarker = new mapboxgl.Marker({ color: '#EF4444' }) // Red color
        .setLngLat(dropoff.coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="marker-popup">
                <h4 class="font-bold">Drop-off</h4>
                <p class="text-sm">${dropoff.placeName}</p>
            </div>
        `))
        .addTo(map);

    // Store markers for later removal
    currentMarkers.push(pickupMarker, dropoffMarker);
}

// Add this new function to recalculate all routes
async function recalculateAllRoutes() {
    // Get all passenger entries
    const passengers = document.querySelectorAll('.passenger-entry');
    
    for (const passenger of passengers) {
        const id = passenger.id.split('-')[1];
        const pickupInput = document.getElementById(`pickup-${id}`);
        const dropoffInput = document.getElementById(`dropoff-${id}`);
        
        // Only recalculate if both locations are filled
        if (pickupInput.value && dropoffInput.value) {
            try {
                const pickup = await getCoordinates(pickupInput.value);
                const dropoff = await getCoordinates(dropoffInput.value);
                
                if (pickup && dropoff) {
                    const routeData = await getRoute(pickup, dropoff);
                    if (routeData) {
                        // Update UI
                        const distanceSpan = document.getElementById(`distance-${id}`);
                        const costSpan = document.getElementById(`cost-${id}`);
                        
                        const distance = (routeData.distance / 1609.34).toFixed(1);
                        const cost = (distance * 2.50).toFixed(2);
                        
                        distanceSpan.textContent = distance;
                        costSpan.textContent = cost;

                        // Draw route on map
                        drawRoute(routeData.geometry);
                        addRouteMarkers(pickup, dropoff);
                    }
                }
            } catch (error) {
                console.error(`Error recalculating route for passenger ${id}:`, error);
            }
        }
    }
    
    // Update total cost after all routes are recalculated
    calculateTotalCost();
}

// Modify removePassenger to also recalculate routes
function removePassenger(id) {
    const passengerDiv = document.getElementById(`passenger-${id}`);
    if (passengerDiv) {
        passengerDiv.remove();
        showAllPassengerMarkers(); // Add this line
        updateRouteSummary();
    }
}

// Update the route summary function
function updateRouteSummary() {
    const summaryPanel = document.getElementById('routeSummaryPanel');
    const passengers = document.querySelectorAll('.passenger-entry');
    
    let summaryHTML = '';
    passengers.forEach(passenger => {
        const id = passenger.id.split('-')[1];
        const name = document.getElementById(`name-${id}`).value || `Passenger ${id}`;
        const pickup = document.getElementById(`pickup-${id}`).value;
        const dropoff = document.getElementById(`dropoff-${id}`).value;
        const distance = document.getElementById(`distance-${id}`).textContent;
        const cost = document.getElementById(`cost-${id}`).textContent;

        if (pickup && dropoff) {
            summaryHTML += `
                <div class="route-item bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="route-number bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                                ${id}
                            </div>
                            <div class="font-semibold text-sm truncate max-w-[100px]">${name}</div>
                        </div>
                        <div class="text-xs font-semibold text-green-500">$${cost}</div>
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        <div class="flex items-center gap-1">
                            <i class="fas fa-map-marker-alt text-green-500 text-xs"></i>
                            <span class="truncate">${pickup}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <i class="fas fa-map-pin text-red-500 text-xs"></i>
                            <span class="truncate">${dropoff}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    if (!summaryHTML) {
        summaryHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-2">
                <i class="fas fa-route text-2xl mb-1"></i>
                <p class="text-sm">No routes calculated yet</p>
            </div>
        `;
    }

    summaryPanel.innerHTML = summaryHTML;
}

function saveTrip() {
    const passengers = [];
    let totalDistance = 0;
    let totalRevenue = 0;

    document.querySelectorAll('.passenger-entry').forEach(entry => {
        const id = entry.id.split('-')[1];
        const name = document.getElementById(`name-${id}`).value || `Passenger ${id}`;
        const pickup = document.getElementById(`pickup-${id}`).value;
        const dropoff = document.getElementById(`dropoff-${id}`).value;
        const distance = parseFloat(document.getElementById(`distance-${id}`).textContent) || 0;
        const cost = parseFloat(document.getElementById(`cost-${id}`).textContent) || 0;

        if (pickup && dropoff) {
            passengers.push({
                name,
                pickup,
                dropoff,
                distance,
                cost
            });
            totalDistance += distance;
            totalRevenue += cost;
        }
    });

    if (passengers.length === 0) {
        utils.showNotification('No passengers to save', 'error');
        return;
    }

    const trip = {
        date: new Date().toISOString(),
        passengers,
        totalDistance,
        totalRevenue
    };

    const trips = utils.getFromLocalStorage('trips', []);
    trips.push(trip);
    utils.saveToLocalStorage('trips', trips);
}

async function optimizeRoute() {
    const passengers = document.querySelectorAll('.passenger-entry');
    if (passengers.length < 2) {
        utils.showNotification('Need at least 2 passengers to optimize route', 'warning');
        return;
    }

    try {
        utils.showNotification('Optimizing route...', 'info');
        
        // Collect all locations
        const locations = [];
        for (const passenger of passengers) {
            const id = passenger.id.split('-')[1];
            const pickup = document.getElementById(`pickup-${id}`).value;
            const dropoff = document.getElementById(`dropoff-${id}`).value;
            
            if (pickup && dropoff) {
                // Get coordinates for pickup
                const pickupCoords = await getCoordinates(pickup);
                locations.push({
                    id,
                    type: 'pickup',
                    address: pickup,
                    coordinates: pickupCoords.coordinates,
                    placeName: pickupCoords.placeName
                });
                
                // Get coordinates for dropoff
                const dropoffCoords = await getCoordinates(dropoff);
                locations.push({
                    id,
                    type: 'dropoff',
                    address: dropoff,
                    coordinates: dropoffCoords.coordinates,
                    placeName: dropoffCoords.placeName
                });
            }
        }

        if (locations.length === 0) {
            throw new Error('No valid locations to optimize');
        }

        // Optimize route order
        const optimizedRoute = await calculateOptimizedRoute(locations);
        
        // Display optimized route
        await displayOptimizedRoute(optimizedRoute);
        
        utils.showNotification('Route optimized successfully!', 'success');
    } catch (error) {
        console.error('Route optimization error:', error);
        utils.showNotification(error.message || 'Error optimizing route', 'error');
    }
}

async function calculateOptimizedRoute(locations) {
    // Start with the first pickup location
    const optimized = [locations[0]];
    const unvisited = locations.slice(1);
    
    while (unvisited.length > 0) {
        const current = optimized[optimized.length - 1];
        let nearestIdx = 0;
        let minDistance = Infinity;
        
        // Find the nearest location
        for (let i = 0; i < unvisited.length; i++) {
            // Check if we can visit this location next
            if (isValidNextStop(optimized, unvisited[i])) {
                const distance = calculateDistance(
                    current.coordinates,
                    unvisited[i].coordinates
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIdx = i;
                }
            }
        }
        
        optimized.push(unvisited[nearestIdx]);
        unvisited.splice(nearestIdx, 1);
    }
    
    return optimized;
}

function isValidNextStop(currentRoute, nextLocation) {
    // Check if all pickups happen before their corresponding dropoffs
    const passengersInTransit = new Set();
    
    // Track passengers from current route
    for (const stop of currentRoute) {
        if (stop.type === 'pickup') {
            passengersInTransit.add(stop.id);
        } else {
            passengersInTransit.delete(stop.id);
        }
    }
    
    if (nextLocation.type === 'dropoff') {
        // Can't drop off if we haven't picked up
        return passengersInTransit.has(nextLocation.id);
    }
    
    return true;
}

async function displayOptimizedRoute(optimizedRoute) {
    // Clear existing markers and routes
    currentMarkers.forEach(marker => marker.remove());
    currentMarkers = [];
    
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
    }
    
    // Create coordinates array for the route
    const coordinates = optimizedRoute.map(location => location.coordinates);
    
    // Add markers for all stops
    optimizedRoute.forEach((location, index) => {
        const color = location.type === 'pickup' ? '#10B981' : '#EF4444';
        const marker = new mapboxgl.Marker({ color })
            .setLngLat(location.coordinates)
            .setPopup(new mapboxgl.Popup().setHTML(`
                <div class="marker-popup">
                    <h4 class="font-bold">${location.type === 'pickup' ? 'Pickup' : 'Drop-off'} - Stop ${index + 1}</h4>
                    <p class="text-sm">Passenger ${location.id}</p>
                    <p class="text-sm">${location.placeName}</p>
                </div>
            `))
            .addTo(map);
        
        currentMarkers.push(marker);
    });
    
    // Draw route line
    map.addSource('route', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        }
    });
    
    map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#3b82f6',
            'line-width': 6,
            'line-opacity': 0.75
        }
    });
    
    // Fit map to show all markers
    const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    
    map.fitBounds(bounds, {
        padding: 50
    });
    
    // Update route summary
    updateRouteSummary();
}

function calculateDistance(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    return Math.sqrt(Math.pow(lon2 - lon1, 2) + Math.pow(lat2 - lat1, 2));
}

function exportRouteData() {
    const passengers = [];
    document.querySelectorAll('.passenger-entry').forEach(entry => {
        const id = entry.id.split('-')[1];
        passengers.push({
            name: document.getElementById(`name-${id}`).value || `Passenger ${id}`,
            pickup: document.getElementById(`pickup-${id}`).value,
            dropoff: document.getElementById(`dropoff-${id}`).value,
            distance: document.getElementById(`distance-${id}`).textContent,
            cost: document.getElementById(`cost-${id}`).textContent
        });
    });

    const csv = generateCSV(passengers);
    downloadCSV(csv, 'route_data.csv');
}

function generateCSV(passengers) {
    const headers = 'Name,Pickup Location,Dropoff Location,Distance (miles),Cost ($)\n';
    const rows = passengers.map(p => 
        `${p.name},${p.pickup},${p.dropoff},${p.distance},${p.cost}`
    ).join('\n');
    return headers + rows;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function printRoute() {
    const printWindow = window.open('', '_blank');
    const content = generatePrintContent();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
}

function generatePrintContent() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Route Summary</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .passenger { margin-bottom: 20px; }
                .stats { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
            </style>
        </head>
        <body>
            <h1>Route Summary</h1>
            <div class="passengers">
                ${Array.from(document.querySelectorAll('.passenger-entry')).map(entry => {
                    const id = entry.id.split('-')[1];
                    return `
                        <div class="passenger">
                            <h3>${document.getElementById(`name-${id}`).value || `Passenger ${id}`}</h3>
                            <p>Pickup: ${document.getElementById(`pickup-${id}`).value}</p>
                            <p>Dropoff: ${document.getElementById(`dropoff-${id}`).value}</p>
                            <p>Distance: ${document.getElementById(`distance-${id}`).textContent} miles</p>
                            <p>Cost: $${document.getElementById(`cost-${id}`).textContent}</p>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="stats">
                <h3>Total Summary</h3>
                <p>Total Distance: ${document.getElementById('totalDistance').textContent} miles</p>
                <p>Total Revenue: $${document.getElementById('totalRevenue').textContent}</p>
            </div>
        </body>
        </html>
    `;
}

function initializeWorkTimer() {
    const workSession = utils.getFromLocalStorage('currentWorkSession', null);
    if (workSession && workSession.startTime) {
        workStartTime = new Date(workSession.startTime);
        startWorkTimer();
        document.getElementById('startWorkBtn').disabled = true;
        document.getElementById('endWorkBtn').disabled = false;
    }
}

function startWork() {
    workStartTime = new Date();
    utils.saveToLocalStorage('currentWorkSession', { startTime: workStartTime });
    startWorkTimer();
    document.getElementById('startWorkBtn').disabled = true;
    document.getElementById('endWorkBtn').disabled = false;
    utils.showNotification('Work session started', 'success');
}

function endWork() {
    if (!workStartTime) return;
    
    const endTime = new Date();
    const duration = endTime - workStartTime;
    
    // Save work session
    const workHours = utils.getFromLocalStorage('workHours', []);
    workHours.push({
        startTime: workStartTime,
        endTime: endTime,
        duration: duration
    });
    utils.saveToLocalStorage('workHours', workHours);
    
    // Clear current session
    localStorage.removeItem('currentWorkSession');
    clearInterval(workTimer);
    workStartTime = null;
    
    // Reset UI
    document.getElementById('currentWorkTime').textContent = '00:00:00';
    document.getElementById('startWorkBtn').disabled = false;
    document.getElementById('endWorkBtn').disabled = true;
    
    utils.showNotification('Work session saved successfully!', 'success');
}

function startWorkTimer() {
    workTimer = setInterval(updateWorkTimer, 1000);
}

function updateWorkTimer() {
    if (!workStartTime) return;
    
    const now = new Date();
    const diff = now - workStartTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    document.getElementById('currentWorkTime').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Add this function to make passengers draggable
function makePassengersDraggable() {
    const passengerList = document.getElementById('passengerList');
    if (!passengerList) return;

    new Sortable(passengerList, {
        animation: 150,
        handle: '.passenger-info', // Use passenger info section as drag handle
        ghostClass: 'passenger-ghost', // Class for the drop placeholder
        chosenClass: 'passenger-chosen', // Class for the dragging item
        dragClass: 'passenger-drag', // Class for the dragging item
        onEnd: function() {
            // Recalculate routes after drag
            recalculateAllRoutes();
            updateRouteSummary();
        }
    });
}

// Add these CSS classes to styles.css
