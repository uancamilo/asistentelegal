export const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  USERS: '/api/users',
};
