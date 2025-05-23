import React from 'react';

const VendingMachineButtons = ({ onShowRoute, onShowInventory }) => {
  return (
    <div className="flex flex-col gap-2 p-2">
      <button
        onClick={onShowRoute}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors"
      >
        Show Route
      </button>
      <button
        onClick={onShowInventory}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium transition-colors"
      >
        Show Inventory
      </button>
    </div>
  );
};

export default VendingMachineButtons;
