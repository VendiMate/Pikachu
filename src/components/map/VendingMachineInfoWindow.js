import React from 'react';
import VendingMachineButtons from './VendingMachineButtons';

const VendingMachineInfoWindow = ({
  vendingMachine,
  onShowRoute,
  onShowInventory,
}) => {
  return (
    <div className="min-w-[200px]">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">Vending Machine</h3>
        {vendingMachine.id && (
          <p className="text-sm text-gray-600">ID: {vendingMachine.id}</p>
        )}
      </div>
      <VendingMachineButtons
        onShowRoute={() => onShowRoute(vendingMachine)}
        onShowInventory={() => onShowInventory(vendingMachine)}
      />
    </div>
  );
};

export default VendingMachineInfoWindow;
