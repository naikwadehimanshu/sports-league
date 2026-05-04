const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const { protect, organizerOrAdmin } = require('../middleware/auth');

// GET /api/tournaments - Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { status, sport, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (sport) filter.sport = new RegExp(sport, 'i');

    const tournaments = await Tournament.find(filter)
      .populate('organizer', 'name email')
      .populate('teams', 'name logo city stats')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tournament.countDocuments(filter);
    res.json({
      success: true,
      data: tournaments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tournaments/:id
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('teams', 'name logo city coach stats');
    if (!tournament)
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tournaments - Create tournament
router.post('/', protect, organizerOrAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.create({ ...req.body, organizer: req.user._id });
    res.status(201).json({ success: true, data: tournament });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/tournaments/:id - Update tournament
router.put('/:id', protect, organizerOrAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!tournament)
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/tournaments/:id
router.delete('/:id', protect, organizerOrAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament)
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, message: 'Tournament deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tournaments/:id/teams - Add team to tournament
router.post('/:id/teams', protect, organizerOrAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ success: false, message: 'Tournament not found' });

    if (tournament.teams.length >= tournament.maxTeams)
      return res.status(400).json({ success: false, message: `Tournament is full (max ${tournament.maxTeams} teams)` });

    const { teamId } = req.body;
    if (!teamId)
      return res.status(400).json({ success: false, message: 'teamId is required' });

    // Verify team exists
    const team = await Team.findById(teamId);
    if (!team)
      return res.status(404).json({ success: false, message: 'Team not found' });

    // Correct ObjectId comparison using .toString()
    const alreadyIn = tournament.teams.some(id => id.toString() === teamId.toString());
    if (alreadyIn)
      return res.status(400).json({ success: false, message: `${team.name} is already in this tournament` });

    tournament.teams.push(teamId);
    await tournament.save();

    // Return fully populated tournament
    const updated = await Tournament.findById(req.params.id)
      .populate('teams', 'name logo city stats');

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/tournaments/:id/teams/:teamId - Remove team from tournament
router.delete('/:id/teams/:teamId', protect, organizerOrAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ success: false, message: 'Tournament not found' });

    tournament.teams = tournament.teams.filter(
      id => id.toString() !== req.params.teamId.toString()
    );
    await tournament.save();

    res.json({ success: true, message: 'Team removed from tournament' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
