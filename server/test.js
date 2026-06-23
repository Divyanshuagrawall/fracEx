require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const u = await User.create({ name: 'DirectTest', email: 'direct@test.com', password: 'hashedpw' });
  console.log('Created:', u);

  const found = await User.findOne({ email: 'direct@test.com' });
  console.log('Found immediately after:', found);

  process.exit(0);
});