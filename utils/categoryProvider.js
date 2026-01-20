const inventory = require('./inventory');

async function fetchCategories() {
  const categories = inventory.reduce((acc, next) => {
    next.categories.map(category => {
      if (acc.includes(category)) return
      acc.push(category)
    })
    return acc
  }, [])
  return Promise.resolve(categories)
}

module.exports = fetchCategories;