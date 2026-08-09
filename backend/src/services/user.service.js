const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  branchId: true,
  isActive: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
};

async function list() {
  return prisma.user.findMany({ select: safeSelect, orderBy: { createdAt: 'desc' } });
}

async function create({ name, email, password, role, branchId }) {
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { name, email, password: hashed, role, branchId: role === 'branch_manager' ? branchId : null },
    select: safeSelect,
  });
}

async function update(id, data) {
  const payload = { ...data };
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  } else {
    delete payload.password;
  }
  return prisma.user.update({ where: { id }, data: payload, select: safeSelect });
}

async function setActive(id, isActive) {
  return prisma.user.update({ where: { id }, data: { isActive }, select: safeSelect });
}

module.exports = { list, create, update, setActive };
