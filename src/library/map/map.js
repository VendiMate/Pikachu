'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import dotenv from 'dotenv';
import {
  VendingMachinePopup,
  VendingMachinesPopup,
} from '../vending-machine/components/popup';
import {
  getRouteToVendingMachine,
  navigateToStep,
  showDirections,
  toggleViewMode,
} from './helper';
import ReactDOM from 'react-dom/client';

dotenv.config();
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [locations, setLocations] = useState([]);
  const [userLocation, setUserLocation] = useState({
    // todo - Setting default location near UCI campus (Aldrich Park area)
    latitude: 33.6461,
    longitude: -117.8427,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [route, setRoute] = useState(null);
  const [nearestLocation, setNearestLocation] = useState(null);
  const [navigationMode, setNavigationMode] = useState(false);
  const [currentLeg, setCurrentLeg] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentInstruction, setCurrentInstruction] = useState(null);
  // const [navigationProgress, setNavigationProgress] = useState(0);
  const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'
  const markers = useRef([]);

  useEffect(() => {
    // Add Google Maps-like CSS for the instructions panel
    const style = document.createElement('style');
    style.innerHTML = `
      /* Google font import */
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
      
      .instructions-header {
        border-bottom: 1px solid #e8eaed;
        margin-bottom: 12px;
        padding: 16px;
      }
      
      .instructions-header h3 {
        color: #202124;
        font-size: 18px;
        font-weight: 500;
        margin: 0 0 8px 0;
      }
      
      .instructions-header p {
        color: #5f6368;
        font-size: 14px;
        margin: 4px 0;
      }
      
      .directions-list {
        padding: 0;
        list-style-type: none;
        margin: 0;
      }
      
      .instruction-step {
        padding: 16px;
        border-bottom: 1px solid #e8eaed;
        cursor: pointer;
        display: flex;
        align-items: center;
      }
      
      .instruction-step:hover {
        background-color: #f8f9fa;
      }
      
      .active-step {
        background-color: #e8f0fe;
      }
      
      .direction-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        margin-right: 16px;
        color: #1a73e8;
        font-size: 18px;
      }
      
      .direction-icon.large {
        width: 36px;
        height: 36px;
        font-size: 24px;
        background-color: #e8f0fe;
        border-radius: 50%;
      }
      
      .instruction-text {
        color: #202124;
        font-size: 14px;
        flex: 1;
      }
      
      .current-step-instruction {
        display: flex;
        align-items: center;
      }
      
      .instruction-details {
        flex: 1;
      }
      
      .main-instruction {
        font-size: 16px;
        color: #202124;
        margin-bottom: 4px;
      }
      
      .step-details {
        font-size: 12px;
        color: #5f6368;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch vending machines coordinates from backend
  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/coordinates`,
        );
        setLocations(res.data.data);
      } catch (error) {
        console.error('Error fetching vending machines coordinates:', error);
        throw error;
      }
    };
    fetchCoordinates();
  }, []);

  // Get Vending Machine Inventory for the selected vending machine
  const getInventory = async (id) => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/vending-machines/inventory/${id}`,
      );
      console.log(res.data);
    } catch (error) {
      console.error('Error fetching vending machine inventory:', error);
      throw error;
    }
  };

  // Find nearest vending machine when locations or user location changes
  useEffect(() => {
    if (locations.length > 0 && userLocation) {
      let nearest = null;
      let minDistance = Infinity;

      locations.forEach((location) => {
        // Calculate distance using Haversine formula (simplified for nearby points)
        const distance = Math.sqrt(
          Math.pow(
            (location.x_coordinate - userLocation.latitude) * 111.32,
            2,
          ) +
            Math.pow(
              (location.y_coordinate - userLocation.longitude) *
                110.57 *
                Math.cos(userLocation.latitude * (Math.PI / 180)),
              2,
            ),
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = location;
        }
      });

      if (nearest) {
        setNearestLocation({
          latitude: nearest.x_coordinate,
          longitude: nearest.y_coordinate,
          id: nearest.id,
          distance: minDistance,
        });
      }
    }
  }, [locations, userLocation]);

  // Initialize map when component mounts
  useEffect(() => {
    // If map is already initialized, return early
    if (map.current) return;

    // Initialize map with satellite style
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // Satellite with streets overlay
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 16,
      pitch: 15, // Less steep pitch for Google Maps-like view
      bearing: 0,
    });

    // Add navigation controls (zoom in/out, rotate)
    map.current.addControl(new mapboxgl.NavigationControl());

    // Add 3D buildings layer when map loads
    map.current.on('load', () => {
      // Add user location marker
      new mapboxgl.Marker({ color: '#0000FF' })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map.current);
    });
  }, [userLocation]);

  // Add markers when location data is loaded
  useEffect(() => {
    if (!map.current || !locations) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add markers for each location
    locations.forEach((location) => {
      const marker = new mapboxgl.Marker({ color: '#FF0000' })
        .setLngLat([location.y_coordinate, location.x_coordinate]) // Mapbox uses [lng, lat]
        .addTo(map.current);

      // Create a container for the popup content
      const popupContainer = document.createElement('div');
      const root = ReactDOM.createRoot(popupContainer);

      // Create a wrapper component to handle cleanup
      const PopupWrapper = () => {
        useEffect(() => {
          // Cleanup function
          return () => {
            root.unmount();
          };
        }, []);

        return (
          <VendingMachinesPopup
            location={location}
            onRouteClick={() => {
              console.log('Route clicked for location:', location.id);
              setSelectedLocation({
                latitude: location.x_coordinate,
                longitude: location.y_coordinate,
                id: location.id,
              });
            }}
            onInventoryClick={() => {
              console.log('Inventory clicked for location:', location.id);
              getInventory(location.id);
            }}
          />
        );
      };

      root.render(<PopupWrapper />);

      const popup = new mapboxgl.Popup({
        offset: 25,
      }).setDOMContent(popupContainer);

      // Hide directions panel when popup is closed
      popup.on('close', () => {
        const instructions = document.getElementById('instructions');
        if (instructions) {
          instructions.style.display = 'none';
        }
        // Clear the selected location to remove the route
        setSelectedLocation(null);
      });

      marker.setPopup(popup);
      markers.current.push(marker);
    });
  }, [locations, userLocation]);

  // Enhance the getRoute function to better process the directions
  useEffect(() => {
    getRouteToVendingMachine(
      map.current,
      userLocation,
      selectedLocation,
      setRoute,
      setRouteCoordinates,
      setCurrentLeg,
      setCurrentInstruction,
    );
  }, [selectedLocation, userLocation]);

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Search bar */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[999] w-[70%] max-w-[600px] bg-white rounded-lg shadow-md flex items-center px-4 py-2.5">
        <span className="mr-2.5 text-gray-500">🔍</span>
        <div className="flex-1 font-['Roboto',_Arial,_sans-serif] text-gray-500">
          Search for vending machines nearby
        </div>
        <button
          onClick={() => showDirections(nearestLocation, setSelectedLocation)}
          className="bg-blue-500 text-white px-3 py-2 rounded-md  transition-colors font-medium text-sm"
        >
          Find Nearest
        </button>
      </div>

      {/* 2D/3D toggle */}
      <div className="absolute top-[100px] right-2.5 z-[999]">
        <button
          onClick={() => toggleViewMode(viewMode, setViewMode)}
          className="bg-white rounded-lg shadow-md p-2.5 w-10 h-10 flex items-center justify-center"
        >
          {viewMode === '3d' ? '2D' : '3D'}
        </button>
      </div>

      {/* Directions panel */}
      <div
        id="instructions"
        className="absolute top-20 left-2.5 bg-white rounded-lg shadow-md max-w-[350px] w-[350px] max-h-[calc(100vh-160px)] overflow-y-auto hidden z-[999] font-['Roboto',_Arial,_sans-serif]"
      />

      {/* Navigation bar */}
      {navigationMode && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center bg-white p-4 rounded-lg shadow-md w-[90%] max-w-[450px] font-['Roboto',_Arial,_sans-serif]">
          {/* <div id="current-instruction" style={{ 
            marginBottom: '15px', 
            fontWeight: 'bold',
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            backgroundColor: '#f1f3f4',
            fontSize: '16px',
            color: '#202124'
          }}>
            {route && route.legs && route.legs[0] && route.legs[0].steps && route.legs[0].steps[0] ? 
              route.legs[0].steps[0].maneuver.instruction : 'Follow the blue path'}
          </div> */}

          <div className="flex justify-between w-full mb-4">
            <button
              onClick={() =>
                navigateToStep(
                  'prev',
                  route?.legs?.[0]?.steps,
                  currentLeg,
                  setCurrentLeg,
                  map.current,
                )
              }
              disabled={currentLeg === 0}
              className={`flex-1 mr-2.5 px-5 py-2.5 rounded-md font-medium text-sm ${
                currentLeg === 0
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-google-blue text-white hover:bg-opacity-90 transition-colors'
              }`}
            >
              Previous
            </button>

            <button
              onClick={() =>
                navigateToStep(
                  'next',
                  route?.legs?.[0]?.steps,
                  currentLeg,
                  setCurrentLeg,
                  map.current,
                )
              }
              disabled={
                currentLeg === (route?.legs?.[0]?.steps?.length - 1 || 0)
              }
              className={`flex-1 ml-2.5 px-5 py-2.5 rounded-md font-medium text-sm ${
                currentLeg === (route?.legs?.[0]?.steps?.length - 1 || 0)
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-google-blue text-white hover:bg-opacity-90 transition-colors'
              }`}
            >
              Next
            </button>
          </div>

          {/* <div style={{ width: '100%', marginBottom: '15px' }}>
            <div style={{ 
              width: '100%', 
              backgroundColor: '#e8eaed', 
              height: '4px', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${navigationProgress}%`, 
                backgroundColor: '#1a73e8', 
                height: '100%' 
              }}></div>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '5px',
              color: '#5f6368',
              fontSize: '12px'
            }}>
              <div>Start</div>
              <div>{navigationProgress}% complete</div>
              <div>Destination</div>
            </div>
          </div> */}

          <button
            onClick={() => {
              const instructions = document.getElementById('instructions');
              if (instructions) {
                instructions.style.display =
                  instructions.style.display === 'none' ? 'block' : 'none';
              }
            }}
            className="w-full px-2.5 py-2.5 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Show/Hide Full Directions
          </button>
        </div>
      )}
    </div>
  );
};
