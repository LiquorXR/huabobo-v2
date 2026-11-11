const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * POST http://8.160.184.132:3000/api/admin/login
 * Body: { username, password }
 */
router.post(
  '/admin/login',
  asyncHandler(async function (req, res) {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: '请输入用户名和密码' });
    }
    if (username !== config.adminUsername || password !== config.adminPassword) {
      return res.status(401).json({ ok: false, message: '用户名或密码错误' });
    }
    const token = jwt.sign({ role: 'admin', username: config.adminUsername }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
    res.json({
      ok: true,
      token,
      expiresIn: config.jwtExpiresIn,
      username: config.adminUsername
    });
  })
);

module.exports = router;
