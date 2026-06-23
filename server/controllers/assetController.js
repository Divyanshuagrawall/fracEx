const Asset = require('../models/Asset');

const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find();
    res.status(200).json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllAssets };