const v4 = () => 'mock-uuid-' + Math.random().toString(36).substring(2, 15);
const v1 = () => 'mock-uuid-v1-' + Math.random().toString(36).substring(2, 15);
const v5 = () => 'mock-uuid-v5-' + Math.random().toString(36).substring(2, 15);

module.exports = { v4, v1, v5, default: { v4, v1, v5 } };