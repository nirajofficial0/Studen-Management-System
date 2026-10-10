const { readDB } = require('./database');

function getStore() {
  return readDB();
}

module.exports = {
  getStore
};
