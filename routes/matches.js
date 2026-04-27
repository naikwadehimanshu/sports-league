const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Team = require('../models/Team');
const { protect, organizerOrAdmin } = require('../middleware/auth');

// GET /api/matches
router.get('/', async (req, res) => {
  try {
    const { tournament, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (tournament) filter.tournament = tournament;
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('tournament', 'name sport')
      .populate('homeTeam', 'name logo')
      .populate('awayTeam', 'name logo')
      .populate('winner', 'name')
      .sort({ matchDate: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Match.countDocuments(filter);
    res.json({ success: true, data: matches, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/matches/:id
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('tournament', 'name sport format')
      .populate('homeTeam', 'name logo city coach')
      .populate('awayTeam', 'name logo city coach')
      .populate('winner', 'name');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches
router.post('/', protect, organizerOrAdmin, async (req, res) => {
  try {
    const match = await Match.create(req.body);
    res.status(201).json({ success: true, data: match });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/matches/:id - Update match (score, status, etc.)
// PUT /api/matches/:id - Update match (score, status, etc.)
router.put('/:id', protect, organizerOrAdmin, async (req, res) => {
  try {
    // Fetch the existing match first so we have the real team ObjectIds
    const existingMatch = await Match.findById(req.params.id);
    if (!existingMatch)
      return res.status(404).json({ success: false, message: 'Match not found' });

    // Determine winner using actual ObjectIds (never accept winner from client)
    let winnerId = null;
    if (req.body.status === 'completed' && req.body.score) {
      const { home, away } = req.body.score;
      if (home > away) {
        winnerId = existingMatch.homeTeam;
      } else if (away > home) {
        winnerId = existingMatch.awayTeam;
      }
      // Draw → winnerId stays null
    }

    // Build the update object, injecting the correct winner ObjectId
    const updateData = { ...req.body };
    updateData.winner = winnerId; // override whatever the client sent

    const match = await Match.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('homeTeam', 'name logo')
      .populate('awayTeam', 'name logo');

    // Update team standings if match is now completed
    if (req.body.status === 'completed' && req.body.score) {
      const { home, away } = req.body.score;
      const homeTeam = await Team.findById(existingMatch.homeTeam);
      const awayTeam = await Team.findById(existingMatch.awayTeam);

      if (homeTeam && awayTeam) {
        if (home > away) {
          homeTeam.stats.wins   += 1;  homeTeam.stats.points += 3;
          awayTeam.stats.losses += 1;
        } else if (away > home) {
          awayTeam.stats.wins   += 1;  awayTeam.stats.points += 3;
          homeTeam.stats.losses += 1;
        } else {
          homeTeam.stats.draws += 1;  homeTeam.stats.points += 1;
          awayTeam.stats.draws += 1;  awayTeam.stats.points += 1;
        }
        homeTeam.stats.goalsFor     += home;
        homeTeam.stats.goalsAgainst += away;
        awayTeam.stats.goalsFor     += away;
        awayTeam.stats.goalsAgainst += home;
        await homeTeam.save();
        await awayTeam.save();
      }
    }

    res.json({ success: true, data: match });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/matches/:id
router.delete('/:id', protect, organizerOrAdmin, async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, message: 'Match deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/matches/standings/:tournamentId
router.get('/standings/:tournamentId', async (req, res) => {
  try {
    const matches = await Match.find({
      tournament: req.params.tournamentId,
      status: 'completed'
    }).populate('homeTeam awayTeam', 'name logo stats');

    res.json({ success: true, data: matches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
