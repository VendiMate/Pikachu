import React from 'react';
import { Map, Info } from 'lucide-react';

export const VendingMachinesPopup = ({
  location,
  onRouteClick,
  onInventoryClick,
}) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Vending Machine</h3>
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          Active
        </span>
      </div>

      <div className="flex flex-col space-y-3">
        <button
          onClick={onRouteClick}
          className="flex items-center justify-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          <Map size={18} className="mr-2" />
          Show Route
        </button>

        <button
          onClick={onInventoryClick}
          className="flex items-center justify-center bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Info size={18} className="mr-2" />
          Check Inventory
        </button>
      </div>
    </div>
  );
};

export default VendingMachinesPopup;
