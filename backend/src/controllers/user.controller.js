const userService = require('../services/user.service');

async function list(req, res, next) {
  try {
    const users = await userService.list();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.update(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function setActive(req, res, next) {
  try {
    const user = await userService.setActive(req.params.id, req.body.isActive);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// Self-service: any authenticated user (admin or branch_manager) registers
// their own device's FCM token — always from req.user.id, never a URL param,
// so nobody can overwrite someone else's token.
async function setMyFcmToken(req, res, next) {
  try {
    const user = await userService.setFcmToken(req.user.id, req.body.fcmToken);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, setActive, setMyFcmToken };