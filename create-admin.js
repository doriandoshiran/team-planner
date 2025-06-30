// Script to create admin user
// Run with: node create-admin.js

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config({ path: './backend/.env' });

// Import User model
const User = require('./backend/src/models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/team-planner');
    console.log('Connected to MongoDB');

    // Get admin details
    const name = await question('Admin name: ');
    const email = await question('Admin email: ');
    const password = await question('Admin password: ');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('\nUser with this email already exists!');
      process.exit(1);
    }

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });

    console.log('\n✓ Admin user created successfully!');
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    
  } catch (error) {
    console.error('\nError creating admin:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdmin();