const inventory = require('./inventory');

async function fetchInventory() {
  return Promise.resolve(inventory);
}

module.exports = {
  fetchInventory
};