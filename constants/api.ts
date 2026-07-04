// constants/api.ts
export const API_BASE_URL = "http://192.168.11.177/firesight_api";

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login.php`,
  register: `${API_BASE_URL}/auth/register.php`,
  
  incidentsRead: `${API_BASE_URL}/incidents/read.php`,
  incidentsCreate: `${API_BASE_URL}/incidents/create.php`,

  profileRead: `${API_BASE_URL}/profile/read.php`,
  profileUpdate: `${API_BASE_URL}/profile/update.php`,
  readinessToggle: `${API_BASE_URL}/profile/readiness_toggle.php`,
  contactAdd: `${API_BASE_URL}/profile/contact_add.php`,
  contactDelete: `${API_BASE_URL}/profile/contact_delete.php`,

};