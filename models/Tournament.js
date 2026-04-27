const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sport: { type: String, required: true },
  format: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'round_robin', 'league'],
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, default: '' },
  description: { type: String, default: '' },
  maxTeams: { type: Number, required: true, min: 2 },
  prizePool: { type: String, default: '' },
  logo: { type: String, default: '' },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
