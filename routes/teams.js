const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { protect, organizerOrAdmin } = require('../middleware/auth');

// GET /api/teams
router.get('/', async (req, res) => {
  try {
    const { sport, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (sport) filter.sport = new RegExp(sport, 'i');

    const teams = await Team.find(filter)
      .populate('manager', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Team.countDocuments(filter);
    res.json({ success: true, data: teams, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('manager', 'name email');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/teams
router.post('/', protect, organizerOrAdmin, async (req, res) => {
  try {
    const team = await Team.create({ ...req.body, manager: req.user._id });
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/teams/:id
router.put('/:id', protect, organizerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/teams/:id
router.delete('/:id', protect, organizerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/teams/:id/players - Add player
router.post('/:id/players', protect, organizerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    team.players.push(req.body);
    await team.save();
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/teams/:id/players/:playerId
router.delete('/:id/players/:playerId', protect, organizerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    team.players = team.players.filter(p => p._id.toString() !== req.params.playerId);
    await team.save();
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
