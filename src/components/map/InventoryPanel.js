import { useState, useEffect } from 'react';
import React from 'react';
import Image from 'next/image';

const InventoryPanel = ({ inventoryData }) => {
  const [snacksData, setSnacksData] = useState(null);
  const [drinksData, setDrinksData] = useState(null);
  useEffect(() => {
    if (Array.isArray(inventoryData)) {
      const snacksData = inventoryData.filter(item => item.inventory_type === 'snack');
      setSnacksData(snacksData);
      const drinksData = inventoryData.filter(item => item.inventory_type === 'drink');
      setDrinksData(drinksData);
    } else if (inventoryData?.data) {
      setSnacksData(inventoryData.data.snacks || []);
      setDrinksData(inventoryData.data.drinks || []);
    } else {
      setSnacksData([]);
      setDrinksData([]);
    }
  }, [inventoryData]);

  return (
    <div className="w-full flex flex-col items-center mt-0">
      <h2 className="mt-3 mb-2 font-semibold text-[1.1em] tracking-tight">
        Inventory
      </h2>
      <div className="w-[92%] max-w-[340px] min-w-[220px] max-h-[240px] overflow-y-auto bg-white rounded-xl shadow-md p-2 flex flex-col gap-2 items-center">
        {snacksData && snacksData.length > 0 && (
          <div className="mb-1 font-medium text-gray-700 self-start text-base">
            Snacks
          </div>
        )}
        {snacksData &&
          snacksData.map((snack) => (
            <div
              key={snack.id}
              className="flex items-center gap-2.5 border-b border-gray-100 py-2 w-full rounded-md transition-colors cursor-pointer hover:bg-gray-50"
            >
              <Image
                src={snack.image_url}
                alt={snack.name}
                width={100}
                height={100}
                className="w-24 h-24 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-base text-gray-900 truncate">
                  {snack.name}
                </div>
                <div className="text-gray-500 text-sm leading-tight">
                  Qty: <span className="text-gray-800">{snack.quantity}</span>
                  <span className="mx-1">|</span>
                  <span>
                    Price:{' '}
                    <span className="text-gray-800">
                      ${snack.default_price}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        {drinksData && drinksData.length > 0 && (
          <div className="mt-2 mb-1 font-medium text-gray-700 self-start text-base">
            Drinks
          </div>
        )}
        {drinksData &&
          drinksData.map((drink) => (
            <div
              key={drink.id}
              className="flex items-center gap-2.5 border-b border-gray-100 py-2 w-full rounded-md transition-colors cursor-pointer hover:bg-gray-50"
            >
              <Image
                src={drink.image_url}
                alt={drink.name}
                width={100}
                height={100}
                className="w-24 h-24 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-base text-gray-900 truncate">
                  {drink.name}
                </div>
                <div className="text-gray-500 text-sm leading-tight">
                  Qty: <span className="text-gray-800">{drink.quantity}</span>
                  <span className="mx-1">|</span>
                  <span>
                    Price:{' '}
                    <span className="text-gray-800">
                      ${drink.default_price}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        {(!snacksData || snacksData.length === 0) &&
          (!drinksData || drinksData.length === 0) && (
            <div className="text-gray-300 text-center mt-8">
              No inventory available.
            </div>
          )}
      </div>
    </div>
  );
};

export default InventoryPanel;
