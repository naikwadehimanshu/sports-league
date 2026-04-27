const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, default: '' },
  jerseyNumber: { type: Number },
  age: { type: Number },
  stats: {
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    matches: { type: Number, default: 0 }
  }
});

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sport: { type: String, required: true },
  logo: { type: String, default: '' },
  city: { type: String, default: '' },
  coach: { type: String, default: '' },
  foundedYear: { type: Number },
  description: { type: String, default: '' },
  players: [playerSchema],
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    points: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);
