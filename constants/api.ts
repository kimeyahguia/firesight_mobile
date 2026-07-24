// constants/api.ts
export const API_BASE_URL = "http://192.168.11.177/firesight_api";

export const API_ENDPOINTS = {

  // ── Authentication ──
  login: `${API_BASE_URL}/auth/login.php`,
  register: `${API_BASE_URL}/auth/register.php`,

  // ── Shared backends 
  riskMap: `${API_BASE_URL}/shared/risk_map.php`,

  // ── Home screen endpoints ──
  homeAlerts: `${API_BASE_URL}/b_user/home/alerts.php`,
  homeEmergencyContacts: `${API_BASE_URL}/b_user/home/emergency_contacts.php`,
  homeResources: `${API_BASE_URL}/b_user/home/resources.php`,

  // ── Map screen endpoints ──
  mapRecentIncidents: `${API_BASE_URL}/b_user/incidents/recent.php`,
  mapBarangayHistory: `${API_BASE_URL}/b_user/incidents/history.php`,

  // ── Incidents ──
  incidentsRead: `${API_BASE_URL}/b_user/incidents/read.php`,
  incidentsCreate: `${API_BASE_URL}/b_user/incidents/submit_report.php`,
  incidentsStatus: `${API_BASE_URL}/b_user/incidents/report_status.php`,

  // ── Profile ──
  profileRead: `${API_BASE_URL}/b_user/profile/read.php`,
  profileUpdate: `${API_BASE_URL}/b_user/profile/update.php`,
  readinessToggle: `${API_BASE_URL}/b_user/profile/readiness_toggle.php`,
  contactAdd: `${API_BASE_URL}/b_user/profile/contact_add.php`,
  contactDelete: `${API_BASE_URL}/b_user/profile/contact_delete.php`,
  changePassword: `${API_BASE_URL}/b_user/profile/change_password.php`,
  updatePhone: `${API_BASE_URL}/b_user/profile/update_phone.php`
,
  // ── Awareness ──
  safetyTopics: `${API_BASE_URL}/b_user/awareness/safety_topics.php`,
  markTopicRead: `${API_BASE_URL}/b_user/awareness/mark_read.php`,
  awarenessResources: `${API_BASE_URL}/b_user/awareness/resources.php`,
  quizQuestions: `${API_BASE_URL}/b_user/awareness/quiz_questions.php`,
  quizResult: `${API_BASE_URL}/b_user/awareness/quiz_result.php`,
  bfpStationInfo: `${API_BASE_URL}/b_user/awareness/station_info.php`,
  bfpPersonnel: `${API_BASE_URL}/b_user/awareness/personnel.php`,


  //BFP PART
  // ── BFP Dashboard ──
  bfpDashboardStats: `${API_BASE_URL}/bfp/dashboard/stats.php`,
  bfpDashboardIncidents: `${API_BASE_URL}/bfp/dashboard/incidents.php`,
  bfpDashboardActivity: `${API_BASE_URL}/bfp/dashboard/activity.php`,
  bfpDashboardNearbyRisk: `${API_BASE_URL}/bfp/dashboard/nearby_risk.php`,

  // ── BFP Notifications ──
  bfpNotificationsList: `${API_BASE_URL}/bfp/notifications/list.php`,
  bfpNotificationsMarkRead: `${API_BASE_URL}/bfp/notifications/mark_read.php`,

  // ── BFP Incidents ──
  bfpIncidentsList: `${API_BASE_URL}/bfp/dashboard/incidents.php`,
  bfpIncidentsVerify: `${API_BASE_URL}/bfp/incidents/verify.php`,
  bfpIncidentsUpdateStatus: `${API_BASE_URL}/bfp/response/update_status.php`,
  bfpIncidentDetails:`${API_BASE_URL}/bfp/incidents/details.php`,
  bfpIncidentsAddAction: `${API_BASE_URL}/bfp/incidents/add_action.php`,
  bfpIncidentsActions: `${API_BASE_URL}/bfp/incidents/actions.php`,

  // ── BFP Resource Allocation ──
  bfpResourceTrucks: `${API_BASE_URL}/bfp/alerts/trucks.php`,
  bfpResourcePersonnel: `${API_BASE_URL}/bfp/alerts/personnel.php`,
  bfpResourceEssentials: `${API_BASE_URL}/bfp/alerts/essentials.php`,
  bfpResourceSummary: `${API_BASE_URL}/bfp/alerts/summary.php`,

  // BFP RESPONSE 
  bfpResponseList: `${API_BASE_URL}/bfp/response/list.php`,
  bfpResponseUpdateStatus: `${API_BASE_URL}/bfp/response/update_status.php`,
  bfpResponseAssignTeam: `${API_BASE_URL}/bfp/response/assign_team.php`,
  
  // ── BFP Profile ──
  bfpProfileUpdate: `${API_BASE_URL}/bfp/profile/update.php`,
  bfpProfileRead: `${API_BASE_URL}/bfp/profile/read.php`,
  bfpProfileChangePassword: `${API_BASE_URL}/bfp/profile/change_password.php`,
  bfpProfileUpdateStatus: `${API_BASE_URL}/bfp/profile/update_status.php`,
  bfpDutySchedule: `${API_BASE_URL}/bfp/profile/duty_schedule.php`,

  // ── BFP Support / About (backend-managed content) ──
  bfpHelpSupport: `${API_BASE_URL}/bfp/support/help.php`,
  bfpAboutApp: `${API_BASE_URL}/bfp/support/about.php`






  // homeBarangayRisk: DEPRECATED — replaced by `riskMap` (shared/risk_map.php).
  // Home screen (fetchBarangayRisks) migrated to riskMapService.fetchRiskMap(). Confirmed unused 2026-07-23.
  // homeBarangayRisk: `${API_BASE_URL}/b_user/home/barangay_risk_summary.php`,
  // mapBarangays: DEPRECATED — replaced by `riskMap` (shared/risk_map.php).
  // map.tsx never actually called this (used riskMapService directly). Confirmed unused 2026-07-23.
  // mapBarangays: `${API_BASE_URL}/b_user/home/barangay.php`,


  // bfpDashboardBarangays: DEPRECATED — replaced by `riskMap` (shared/risk_map.php).
  // BFP dashboard mini-map migrated to riskMapService.fetchRiskMap(). Confirmed unused 2026-07-23.
  // bfpDashboardBarangays: `${API_BASE_URL}/bfp/dashboard/barangays.php`,
  // bfpRiskMap: DEPRECATED — replaced by `riskMap` (shared/risk_map.php).
  // alerts.tsx (RiskMapTab) migrated to riskMapService.fetchRiskMap(). Confirmed unused 2026-07-23.
  // bfpRiskMap: `${API_BASE_URL}/bfp/alerts/risk_map.php`,
};