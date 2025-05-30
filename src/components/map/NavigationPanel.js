import React, { useEffect, useState } from 'react';
import axios from 'axios';
import InventoryPanel from './InventoryPanel';

const NavigationPanel = ({
  directions,
  navigating,
  showStreetView,
  showInventory,
  onNavigationToggle,
  onStreetViewToggle,
  onInventoryToggle,
  mainInstruction,
  inventoryData,
}) => {
  const [apiInventoryData, setApiInventoryData] = useState(null);
  useEffect(() => {
    const fetchInventoryData = async (id) => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/vending-machines/inventory/${id}`,
        );
        console.log(res.data);
        setApiInventoryData(res.data);
      } catch (err) {
        alert('Failed to get inventory data.');
        console.error(err);
      }
    };

    if (inventoryData) {
      fetchInventoryData(inventoryData.id);
    }
  }, [inventoryData]);

  if (!directions?.routes?.[0]?.legs?.[0]) return null;

  const { distance, duration } = directions.routes[0].legs[0];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">
          Navigate to Nearest Vending Machine
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div>
          <div className="px-4 py-3">
            {/* Distance and Duration */}
            <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-lg p-2">
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 text-blue-500 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  ></path>
                </svg>
                <span className="text-sm font-medium text-gray-600">
                  {distance.text}
                </span>
              </div>

              <div className="flex items-center">
                <svg
                  className="w-4 h-4 text-blue-500 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span className="text-sm font-medium text-gray-600">
                  {duration.text}
                </span>
              </div>
            </div>

            {/* Main Instruction */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-4">
              <p className="text-base font-medium text-blue-700">
                {mainInstruction}
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-3 mb-3">
              <button
                onClick={onNavigationToggle}
                className={`py-2 px-3 rounded-lg font-medium text-white transition-colors flex items-center justify-center ${
                  navigating
                    ? 'bg-gray-500 hover:bg-gray-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4"
                  ></path>
                </svg>
                {navigating ? 'Stop Navigation' : 'Start Navigation'}
              </button>

              <button
                onClick={onStreetViewToggle}
                className={`py-2 px-3 rounded-lg font-medium text-white transition-colors flex items-center justify-center ${
                  showStreetView
                    ? 'bg-gray-500 hover:bg-gray-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v10.764a1 1 0 01-1.447.894L15 18M5 18l-4.553-2.276A1 1 0 010 14.618V3.832a1 1 0 011.447-.894L6 5m0 13V5m9 13V5"
                  ></path>
                </svg>
                {showStreetView ? 'Hide Street View' : 'Show Street View'}
              </button>

              <button
                onClick={onInventoryToggle}
                className={`py-2 px-3 rounded-lg font-medium text-white transition-colors flex items-center justify-center ${
                  showInventory
                    ? 'bg-gray-500 hover:bg-gray-600'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v10.764a1 1 0 01-1.447.894L15 18M5 18l-4.553-2.276A1 1 0 010 14.618V3.832a1 1 0 011.447-.894L6 5m0 13V5m9 13V5"
                  ></path>
                </svg>
                Check out Inventory
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Data */}
        {showInventory && apiInventoryData && (
          <InventoryPanel inventoryData={apiInventoryData} />
        )}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 italic border-t border-gray-100">
        Drag the blue &quot;You&quot; marker to simulate your location. Use
        Street View to see the real-world route start.
      </div>
    </div>
  );
};

export default NavigationPanel;
