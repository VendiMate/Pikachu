'use client';
import React, { useEffect, useState, useRef } from 'react';
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  StreetViewPanorama,
  useJsApiLoader,
} from '@react-google-maps/api';
import axios from 'axios';
import VendingMachineInfoWindow from '@/components/map/VendingMachineInfoWindow';
import NavigationPanel from '@/components/map/NavigationPanel';
import { createRoot } from 'react-dom/client';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const containerStyle = {
  width: '100%',
  height: '100vh',
};

const UCI_LOCATION = { lat: 33.6461, lng: -117.8427 };

export default function GoogleMaps() {
  const [userLocation, setUserLocation] = useState(UCI_LOCATION);
  const [vendingMachines, setVendingMachines] = useState([]);
  const [nearest, setNearest] = useState(null);
  const [directions, setDirections] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [streetViewPosition, setStreetViewPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [streetViewAvailable, setStreetViewAvailable] = useState(true);
  const [panoLinks, setPanoLinks] = useState([]);
  const [panoHeading, setPanoHeading] = useState(0);
  const [clickedMarker, setClickedMarker] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const mapRef = useRef(null);
  const streetViewRef = useRef(null);
  const infoWindowRef = useRef(null);

  // Load Google Maps JS API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  // Fetch vending machines from backend and sanitize coordinates
  useEffect(() => {
    const fetchVendingMachines = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/coordinates`,
        );
        setVendingMachines(
          res.data
            .map((vm) => ({
              ...vm,
              lat: parseFloat(vm.x_coordinate),
              lng: parseFloat(vm.y_coordinate),
            }))
            .filter((vm) => !isNaN(vm.lat) && !isNaN(vm.lng)),
        );
      } catch (err) {
        alert('Failed to fetch vending machines.');
      }
    };
    fetchVendingMachines();
  }, []);

  // Find nearest vending machine whenever user moves or vending machines update
  useEffect(() => {
    if (!userLocation || vendingMachines.length === 0) return;
    let minDist = Infinity;
    let nearestVM = null;
    vendingMachines.forEach((vm) => {
      if (isNaN(vm.lat) || isNaN(vm.lng)) return;
      const dx = (vm.lat - userLocation.lat) * 111.32;
      const dy =
        (vm.lng - userLocation.lng) *
        110.57 *
        Math.cos(userLocation.lat * (Math.PI / 180));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearestVM = vm;
      }
    });
    setNearest(nearestVM);
  }, [userLocation, vendingMachines]);

  // Get walking directions to nearest vending machine in real time
  useEffect(() => {
    if (
      !userLocation ||
      !nearest ||
      !isLoaded ||
      isNaN(nearest.lat) ||
      isNaN(nearest.lng)
    )
      return;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: { lat: nearest.lat, lng: nearest.lng },
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        } else {
          setDirections(null);
        }
      },
    );
  }, [userLocation, nearest, isLoaded]);

  // Only auto-pan the map when navigating and not dragging
  useEffect(() => {
    if (navigating && !isDragging && mapRef.current && userLocation) {
      mapRef.current.panTo(userLocation);
    }
  }, [userLocation, navigating, isDragging]);

  // Show Street View at the start of the route, but only if available
  const handleShowStreetView = () => {
    if (directions && directions.routes[0].legs[0].start_location) {
      const svService = new window.google.maps.StreetViewService();
      const startLoc = directions.routes[0].legs[0].start_location;
      svService.getPanorama(
        { location: startLoc, radius: 200 },
        (data, status) => {
          if (
            status === window.google.maps.StreetViewStatus.OK &&
            data &&
            data.location &&
            data.location.latLng
          ) {
            setStreetViewPosition({
              lat: data.location.latLng.lat(),
              lng: data.location.latLng.lng(),
            });
            setShowStreetView(true);
            setStreetViewAvailable(true);
          } else {
            setStreetViewAvailable(false);
            setShowStreetView(true);
          }
        },
      );
    }
  };

  const handleHideStreetView = () => {
    setShowStreetView(false);
    setStreetViewPosition(null);
    setStreetViewAvailable(true);
    setPanoLinks([]);
    setIsDragging(false);
  };

  // Get the first step instruction (if available)
  let mainInstruction = '';
  if (
    directions &&
    directions.routes[0].legs[0] &&
    directions.routes[0].legs[0].steps[0]
  ) {
    mainInstruction =
      directions.routes[0].legs[0].steps[0].instructions.replace(
        /<[^>]+>/g,
        '',
      ); // Remove HTML tags
  }

  // Street View navigation: update pano links and heading
  const handlePanoChanged = () => {
    if (streetViewRef.current) {
      const pano = streetViewRef.current.getPano();
      const pov = streetViewRef.current.getPov();
      const links = streetViewRef.current.getLinks();

      // Update heading and links state
      setPanoHeading(pov.heading);
      if (links && links.length > 0) {
        // Sort links by heading relative to current view
        const sortedLinks = [...links].sort((a, b) => {
          const diffA = Math.abs(((a.heading - pov.heading + 540) % 360) - 180);
          const diffB = Math.abs(((b.heading - pov.heading + 540) % 360) - 180);
          return diffA - diffB;
        });
        setPanoLinks(sortedLinks);
      }
    }
  };

  // Move Street View in a direction
  const moveStreetView = (direction) => {
    if (!streetViewRef.current || !panoLinks.length) return;

    const currentPov = streetViewRef.current.getPov();
    const currentHeading = currentPov.heading;
    let targetHeading;

    // Calculate target heading based on direction
    switch (direction) {
      case 'forward':
        targetHeading = currentHeading;
        break;
      case 'left':
        targetHeading = (currentHeading - 90 + 360) % 360;
        break;
      case 'right':
        targetHeading = (currentHeading + 90) % 360;
        break;
      default:
        return;
    }

    // Find the link closest to our target heading
    let bestLink = null;
    let minDiff = 360;

    panoLinks.forEach((link) => {
      // Calculate the difference between link heading and target heading
      const diff = Math.abs(((link.heading - targetHeading + 540) % 360) - 180);
      if (diff < minDiff) {
        minDiff = diff;
        bestLink = link;
      }
    });

    // Only move if we found a suitable link and it's not too far off our target
    if (bestLink && minDiff < 45) {
      // 45 degrees threshold
      // Move to the new panorama
      streetViewRef.current.setPano(bestLink.pano);

      // Set the heading to match the link's heading
      streetViewRef.current.setPov({
        heading: bestLink.heading,
        pitch: 0,
      });

      // Force an update of the panorama state
      setTimeout(() => {
        if (streetViewRef.current) {
          handlePanoChanged();
        }
      }, 100);
    }
  };

  // Add a click handler for the panorama to help with navigation
  const handlePanoClick = (e) => {
    if (!streetViewRef.current) return;

    // Get the clicked position
    const latLng = e.latLng;
    if (!latLng) return;

    // Get the current panorama position
    const currentPosition = streetViewRef.current.getPosition();
    if (!currentPosition) return;

    // Calculate heading to clicked point
    const heading = google.maps.geometry.spherical.computeHeading(
      currentPosition,
      latLng,
    );

    // Set the view to look at the clicked point
    streetViewRef.current.setPov({
      heading: heading,
      pitch: 0,
    });
  };

  // Add effect to reset dragging when navigation stops
  useEffect(() => {
    if (!navigating) {
      setIsDragging(false);
      // Force a re-render of the marker by updating userLocation
      setUserLocation((prev) => ({ ...prev }));
    }
  }, [navigating]);

  // Update the navigation toggle handler
  const handleNavigationToggle = () => {
    setNavigating((prev) => {
      if (prev) {
        // When stopping navigation, only reset dragging state
        setIsDragging(false);
        // Don't reset userLocation or directions when stopping navigation
      }
      return !prev;
    });
  };

  // Add function to handle marker click
  const handleMarkerClick = (vm) => {
    setClickedMarker(vm);
  };

  // Add function to show route to clicked marker
  const handleShowRoute = (vm) => {
    if (!userLocation || !isLoaded) return;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: { lat: vm.lat, lng: vm.lng },
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
          setClickedMarker(null); // Close the info window
        } else {
          setDirections(null);
        }
      },
    );
  };

  // Add function to show inventory from info window
  const handleShowInventoryFromInfo = (vm) => {
    console.log('Inventory for vending machine:', vm);
    setShowInventory(true);
    setInventoryData(vm);
    // Don't immediately close the info window
  };

  // Add function to show inventory from navigation panel
  const handleShowInventoryFromNav = () => {
    setShowInventory(true);
  };

  // Add function to hide inventory
  const handleHideInventory = () => {
    setShowInventory(false);
    setClickedMarker(null); // Close the info window only when hiding inventory
  };

  // Update effect to use React components
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    let root = null;

    // Create info window if it doesn't exist
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    // Show info window when marker is clicked
    if (clickedMarker) {
      // Create a div to render our React component
      const contentDiv = document.createElement('div');

      // Create a root and render our component
      root = createRoot(contentDiv);
      root.render(
        <VendingMachineInfoWindow
          vendingMachine={clickedMarker}
          onShowRoute={handleShowRoute}
          onShowInventory={handleShowInventoryFromInfo}
        />,
      );

      // Set the content and position of the info window
      infoWindowRef.current.setContent(contentDiv);
      infoWindowRef.current.setPosition({
        lat: clickedMarker.lat,
        lng: clickedMarker.lng,
      });
      infoWindowRef.current.open(mapRef.current);
    } else {
      infoWindowRef.current.close();
    }

    // Cleanup function to unmount React component
    return () => {
      if (root) {
        // Use setTimeout to ensure we're not unmounting during render
        setTimeout(() => {
          root.unmount();
        }, 0);
      }
    };
  }, [clickedMarker, isLoaded, showInventory]);

  // Add click handler to map to close info window
  const handleMapClick = () => {
    setClickedMarker(null);
  };

  if (!isLoaded) return <div>Loading Google Maps...</div>;

  return (
    <div className="flex w-screen h-screen">
      {/* Navigation Panel - Left Side (1/5) */}
      <div className="w-1/5 h-screen bg-white shadow-lg overflow-y-auto">
        {!showStreetView && (
          <NavigationPanel
            directions={directions}
            navigating={navigating}
            showStreetView={showStreetView}
            onNavigationToggle={handleNavigationToggle}
            onStreetViewToggle={
              showStreetView ? handleHideStreetView : handleShowStreetView
            }
            mainInstruction={mainInstruction}
            showInventory={showInventory}
            onInventoryToggle={
              showInventory ? handleHideInventory : handleShowInventoryFromNav
            }
            inventoryData={inventoryData}
          />
        )}
      </div>

      {/* Map Container - Right Side (4/5) */}
      <div className="w-4/5 h-screen relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation}
          zoom={16}
          onLoad={(map) => (mapRef.current = map)}
          onClick={handleMapClick}
        >
          {/* Hide all overlays/markers when Street View is active */}
          {!showStreetView && (
            <>
              {/* User marker (always draggable) */}
              {userLocation && (
                <Marker
                  key={`marker-${navigating}-${isDragging}`}
                  position={userLocation}
                  label="You"
                  draggable={!navigating}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={(e) => {
                    setUserLocation({
                      lat: e.latLng.lat(),
                      lng: e.latLng.lng(),
                    });
                    setIsDragging(false);
                  }}
                />
              )}
              {/* Vending machine markers */}
              {vendingMachines.map(
                (vm, idx) =>
                  !isNaN(vm.lat) &&
                  !isNaN(vm.lng) && (
                    <Marker
                      key={vm.id || idx}
                      position={{ lat: vm.lat, lng: vm.lng }}
                      label="VM"
                      icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        scaledSize: { width: 32, height: 32 },
                      }}
                      onClick={() => handleMarkerClick(vm)}
                    />
                  ),
              )}
              {/* Directions */}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    preserveViewport: true,
                    polylineOptions: {
                      strokeColor: '#4285F4',
                      strokeWeight: 5,
                      strokeOpacity: 0.8,
                    },
                  }}
                />
              )}
            </>
          )}
          {/* Street View Panorama or message */}
          {showStreetView &&
            (streetViewAvailable && streetViewPosition ? (
              <>
                <StreetViewPanorama
                  onLoad={(pano) => (streetViewRef.current = pano)}
                  position={streetViewPosition}
                  visible={true}
                  options={{
                    addressControl: false,
                    linksControl: false,
                    panControl: false,
                    enableCloseButton: false,
                    fullscreenControl: false,
                    zoomControl: false,
                    motionTracking: false,
                    clickToGo: true,
                  }}
                  onPanoChanged={handlePanoChanged}
                  onPositionChanged={handlePanoChanged}
                  onPovChanged={handlePanoChanged}
                  onClick={handlePanoClick}
                />
                {/* Big navigation arrows overlay */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex gap-10 pointer-events-none">
                  <button
                    onClick={() => moveStreetView('left')}
                    className="pointer-events-auto bg-black/50 border-none rounded-full w-[70px] h-[70px] text-white text-[2.5rem] font-bold mr-2 cursor-pointer shadow-lg hover:bg-black/70 transition-colors"
                    aria-label="Turn Left"
                  >
                    &#8592;
                  </button>
                  <button
                    onClick={() => moveStreetView('forward')}
                    className="pointer-events-auto bg-green-500/90 border-none rounded-full w-[90px] h-[90px] text-white text-[3rem] font-bold mx-2 cursor-pointer shadow-xl hover:bg-green-600 transition-colors"
                    aria-label="Move Forward"
                  >
                    &#8593;
                  </button>
                  <button
                    onClick={() => moveStreetView('right')}
                    className="pointer-events-auto bg-black/50 border-none rounded-full w-[70px] h-[70px] text-white text-[2.5rem] font-bold ml-2 cursor-pointer shadow-lg hover:bg-black/70 transition-colors"
                    aria-label="Turn Right"
                  >
                    &#8594;
                  </button>
                </div>
                {/* Close Street View button */}
                <button
                  onClick={handleHideStreetView}
                  className="absolute top-8 right-8 z-50 bg-blue-600 text-white rounded-lg px-6 py-2.5 font-semibold text-lg cursor-pointer shadow-lg hover:bg-blue-700 transition-colors"
                >
                  Close Street View
                </button>
              </>
            ) : (
              <div className="absolute bottom-0 left-0 w-screen h-1/2 bg-black/85 text-white z-30 flex items-center justify-center text-xl font-semibold">
                Street View not available at this location.
                <button
                  onClick={handleHideStreetView}
                  className="ml-6 bg-blue-600 text-white rounded px-4 py-2 cursor-pointer font-medium hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ))}
        </GoogleMap>
      </div>
    </div>
  );
}
