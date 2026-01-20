const { fetchInventory } = require('./inventoryProvider');
const { inventoryByCategory } = require('./inventoryByCategory');

async function inventoryForCategory(category) {
  const inventory = await fetchInventory()
  const byCategory = inventoryByCategory(inventory)
  return byCategory[category].items
}

module.exports = inventoryForCategory;