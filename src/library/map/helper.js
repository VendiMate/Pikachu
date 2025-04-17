//routeSteps is route.legs[0].steps;
import axios from 'axios';
import mapboxgl from 'mapbox-gl';

export const navigateToStep = (
  direction,
  steps,
  currentLeg,
  setCurrentLeg,
  map,
) => {
  if (!steps || !steps.length) return;
  let nextStep;
  if (direction === 'next') {
    nextStep = Math.min(currentLeg + 1, steps.length - 1);
  } else if (direction === 'prev') {
    nextStep = Math.max(currentLeg - 1, 0);
  } else {
    return;
  }

  setCurrentLeg(nextStep);

  const step = steps[nextStep];
  if (step && step.maneuver && step.maneuver.location) {
    // Calculate the bearing based on the direction of travel
    let bearing = 0;
    if (direction === 'next') {
      // For next step, use the bearing_after of current step
      bearing = step.maneuver.bearing_after || 0;
    } else if (direction === 'prev') {
      bearing = step.maneuver.bearing_before || 0;
    }

    map.flyTo({
      center: step.maneuver.location,
      zoom: 19,
      pitch: 60,
      bearing: bearing,
      essential: true,
      duration: 1000,
    });
  }

  document.querySelectorAll('.instruction-step').forEach((el) => {
    el.classList.remove('active-step');
  });
  const stepElement = document.getElementById(`step-${nextStep}`);
  if (stepElement) {
    stepElement.classList.add('active-step');
    // Scroll to make the step visible in the instructions panel
    stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

export const showDirections = (nearestLocation, setSelectedLocation) => {
  if (nearestLocation) {
    setSelectedLocation({
      latitude: nearestLocation.latitude,
      longitude: nearestLocation.longitude,
      id: nearestLocation.id,
    });
  }
};

export const toggleViewMode = (viewMode, setViewMode) => {
  if (viewMode === '3d') {
    setViewMode('2d');
  } else {
    setViewMode('3d');
  }
};

export const getRouteToVendingMachine = async (
  map,
  userLocation,
  selectedVendingMachineLocation,
  setRoute,
  setRouteCoordinates,
  setCurrentLeg,
) => {
  if (!userLocation || !selectedVendingMachineLocation) return;

  try {
    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${userLocation.longitude},${userLocation.latitude};${selectedVendingMachineLocation.longitude},${selectedVendingMachineLocation.latitude}`,
      {
        params: {
          access_token: mapboxgl.accessToken,
          alternatives: true,
          geometries: 'geojson',
          steps: true,
          annotations: 'distance,duration',
          overview: 'full',
          voice_instructions: true,
          banner_instructions: true,
        },
      },
    );
    const { distance, duration, routeSteps, routeGeometry } =
      processRouteInformation(response.data);
    setRoute(routeSteps);
    setRouteCoordinates(routeGeometry.coordinates);
    setCurrentLeg(0);

    // If a route already exists on the map, remove it
    if (map.getSource('route')) {
      map.removeLayer('route-layer');
      map.removeSource('route');
    }

    // Remove all turn points
    if (map.getSource('turn-points')) {
      map.removeLayer('turn-points-layer');
      map.removeSource('turn-points');
    }

    // Add the route to the map
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: routeGeometry,
      },
    });

    // Add the route layer to the map
    map.addLayer({
      id: 'route-layer',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#34a853',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    // Create points at each maneuver location
    const turnPoints = routeSteps.map((step, i) => ({
      type: 'Feature',
      properties: {
        index: i,
        instruction: step.maneuver.instruction,
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
      },
      geometry: {
        type: 'Point',
        coordinates: step.maneuver.location,
      },
    }));

    map.addSource('turn-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: turnPoints,
      },
    });

    // Add colored markers for different turn types
    map.addLayer({
      id: 'turn-points-layer',
      type: 'circle',
      source: 'turn-points',
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'match',
          ['get', 'modifier'],
          'left',
          '#34a853',
          'right',
          '#34a853',
          'straight',
          '#34a853',
          '#34a853',
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    // Add start and destination markers
    // If a route already exists on the map, remove it
    if (map.getSource('endpoint-markers')) {
      map.removeLayer('endpoint-markers-layer');
      map.removeSource('endpoint-markers');
    }

    // Add the endpoint markers to the map
    map.addSource('endpoint-markers', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              type: 'start',
            },
            geometry: {
              type: 'Point',
              coordinates: [userLocation.longitude, userLocation.latitude],
            },
          },
          {
            type: 'Feature',
            properties: {
              type: 'end',
            },
            geometry: {
              type: 'Point',
              coordinates: [
                selectedVendingMachineLocation.longitude,
                selectedVendingMachineLocation.latitude,
              ],
            },
          },
        ],
      },
    });

    // Add the endpoint markers layer to the map
    map.addLayer({
      id: 'endpoint-markers-layer',
      type: 'circle',
      source: 'endpoint-markers',
      paint: {
        'circle-radius': 6,
        'circle-color': ['get', 'type'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    fitMapToRoute(map, routeGeometry.coordinates);
    addGoogleMapsLikeDirections(map, routeSteps);
  } catch (error) {
    console.error('Error getting route to vending machine:', error);
    throw error;
  }
};

const processRouteInformation = (routeData) => {
  const distance = routeData.routes[0].distance;
  const duration = routeData.routes[0].duration;
  const routeSteps = routeData.routes[0].legs[0].steps;
  const routeGeometry = routeData.routes[0].geometry;

  return {
    distance,
    duration,
    routeSteps,
    routeGeometry,
  };
};

const fitMapToRoute = (map, routeCoordinates) => {
  const bounds = new mapboxgl.LngLatBounds(
    routeCoordinates[0],
    routeCoordinates[0],
  );
  routeCoordinates.forEach((coord) => {
    bounds.extend(new mapboxgl.LngLat(coord[0], coord[1]));
  });
  map.fitBounds(bounds, { padding: 80 });
};

const addGoogleMapsLikeDirections = (map, routeSteps) => {
  const directionsPanel = document.getElementById('instructions');
  if (!directionsPanel) return;

  const totalDistance = Math.round(
    routeSteps.reduce((sum, step) => sum + step.distance, 0),
  );
  const totalDuration = Math.floor(
    routeSteps.reduce((sum, step) => sum + step.duration, 0) / 60,
  );

  let instructionsHTML = `
        <div class="instructions-header">
            <h3>Directions to Vending Machine</h3>
            <p><strong>${totalDistance} meters</strong> (about ${totalDuration} min)</p>
        </div>
    `;

  instructionsHTML += '<ol class="directions-list">';

  // Add starting point
  instructionsHTML += `
        <li class="instruction-step" id="step-start">
            <span class="direction-icon">●</span>
            <span class="instruction-text">Your location</span>
        </li>
    `;

  // Add each direction step
  routeSteps.forEach((step, idx) => {
    let directionIcon = '→';
    if (step.maneuver.modifier === 'left') directionIcon = '←';
    if (step.maneuver.modifier === 'right') directionIcon = '→';
    if (step.maneuver.modifier === 'slight left') directionIcon = '↖';
    if (step.maneuver.modifier === 'slight right') directionIcon = '↗';
    if (step.maneuver.modifier === 'sharp left') directionIcon = '↰';
    if (step.maneuver.modifier === 'sharp right') directionIcon = '↱';
    if (step.maneuver.type === 'arrive') directionIcon = '🏁';

    const distance = step.distance ? `${Math.round(step.distance)} m` : '';

    instructionsHTML += `
            <li class="instruction-step" id="step-${idx}" onClick="focusStep(${idx})">
                <span class="direction-icon">${directionIcon}</span>
                <div class="instruction-details">
                    <div class="main-instruction">${step.maneuver.instruction}</div>
                    ${distance ? `<div class="step-details">${distance}</div>` : ''}
                </div>
            </li>
        `;
  });

  instructionsHTML += '</ol>';

  directionsPanel.innerHTML = instructionsHTML;
  directionsPanel.style.display = 'block';

  // Add the step focus function to window
  window.focusStep = (stepIndex) => {
    const step = routeSteps[stepIndex];
    if (step && step.maneuver && step.maneuver.location) {
      map.flyTo({
        center: step.maneuver.location,
        zoom: 19,
        pitch: 60,
        bearing: step.maneuver.bearing_after || 0,
        essential: true,
        duration: 1000,
      });

      // Highlight the current step in the instructions
      document.querySelectorAll('.instruction-step').forEach((el) => {
        el.classList.remove('active-step');
      });
      document.getElementById(`step-${stepIndex}`).classList.add('active-step');
    }
  };
};
