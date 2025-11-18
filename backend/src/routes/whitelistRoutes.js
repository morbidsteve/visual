const express = require('express');
const { body, param, validationResult } = require('express-validator');
const whitelistService = require('../services/whitelistService');

const router = express.Router();

/**
 * GET /api/whitelist
 * Get all whitelist entries
 */
router.get('/', (req, res) => {
  try {
    const entryType = req.query.type;
    const entries = whitelistService.getAllEntries(entryType);
    res.json(entries);
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    res.status(500).json({ error: 'Failed to fetch whitelist' });
  }
});

/**
 * POST /api/whitelist
 * Add entry to whitelist
 */
router.post('/',
  [
    body('entryType').isIn(['ip', 'subnet', 'connection', 'protocol']),
    body('value').notEmpty(),
    body('description').optional()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { entryType, value, description } = req.body;
      const entry = whitelistService.addEntry(entryType, value, description);
      res.status(201).json(entry);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      console.error('Error adding to whitelist:', error);
      res.status(500).json({ error: 'Failed to add to whitelist' });
    }
  }
);

/**
 * DELETE /api/whitelist/:id
 * Remove entry from whitelist
 */
router.delete('/:id',
  [param('id').isInt()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = whitelistService.removeEntry(id);

      if (deleted) {
        res.json({ message: 'Entry removed from whitelist' });
      } else {
        res.status(404).json({ error: 'Entry not found' });
      }
    } catch (error) {
      console.error('Error removing from whitelist:', error);
      res.status(500).json({ error: 'Failed to remove from whitelist' });
    }
  }
);

/**
 * POST /api/whitelist/check
 * Check if entry is whitelisted
 */
router.post('/check',
  [
    body('entryType').isIn(['ip', 'subnet', 'connection', 'protocol']),
    body('value').notEmpty()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { entryType, value } = req.body;
      const isWhitelisted = whitelistService.isWhitelisted(entryType, value);
      res.json({ isWhitelisted });
    } catch (error) {
      console.error('Error checking whitelist:', error);
      res.status(500).json({ error: 'Failed to check whitelist' });
    }
  }
);

module.exports = router;
