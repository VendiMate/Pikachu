//routeSteps is route.legs[0].steps;
import axios from 'axios';
import mapboxgl from 'mapbox-gl';

export const navigateToStep = (
  direction,
  steps,
  currentLeg,
  setCurrentLeg,
  map,
  setCurrentInstruction,
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
      bearing = step.maneuver.bearing_after || 0;
    } else if (direction === 'prev') {
      bearing = step.maneuver.bearing_before || 0;
    }

    // Update current instruction
    let directionIcon = '→';
    if (step.maneuver.modifier === 'left') directionIcon = '←';
    if (step.maneuver.modifier === 'right') directionIcon = '→';
    if (step.maneuver.modifier === 'slight left') directionIcon = '↖';
    if (step.maneuver.modifier === 'slight right') directionIcon = '↗';
    if (step.maneuver.modifier === 'sharp left') directionIcon = '↰';
    if (step.maneuver.modifier === 'sharp right') directionIcon = '↱';
    if (step.maneuver.type === 'arrive') directionIcon = '🏁';

    setCurrentInstruction({
      icon: directionIcon,
      text: step.maneuver.instruction,
      distance: step.distance ? Math.round(step.distance) : null,
    });

    map.flyTo({
      center: step.maneuver.location,
      zoom: 19,
      pitch: 60,
      bearing: bearing,
      essential: true,
      duration: 1000,
    });
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
  setCurrentInstruction,
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

    // Set initial instruction
    if (routeSteps && routeSteps[0]) {
      const firstStep = routeSteps[0];
      let directionIcon = '→';
      if (firstStep.maneuver.modifier === 'left') directionIcon = '←';
      if (firstStep.maneuver.modifier === 'right') directionIcon = '→';
      if (firstStep.maneuver.modifier === 'slight left') directionIcon = '↖';
      if (firstStep.maneuver.modifier === 'slight right') directionIcon = '↗';
      if (firstStep.maneuver.modifier === 'sharp left') directionIcon = '↰';
      if (firstStep.maneuver.modifier === 'sharp right') directionIcon = '↱';
      if (firstStep.maneuver.type === 'arrive') directionIcon = '🏁';

      setCurrentInstruction({
        icon: directionIcon,
        text: firstStep.maneuver.instruction,
        distance: firstStep.distance ? Math.round(firstStep.distance) : null,
      });
    }

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

    // Add start and destination markers
    if (map.getSource('endpoint-markers')) {
      map.removeLayer('endpoint-markers-layer');
      map.removeSource('endpoint-markers');
    }

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
