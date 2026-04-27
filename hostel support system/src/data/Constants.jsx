export const Constants = {
  'API': "http://localhost:5000",
  'ROUTES': {
    // Auth Routes
    'LOGIN': '/login',
    'SIGNUP': '/signup',
    'VERIFY': '/verify',
    'ME': '/me',
    'LOGOUT': '/logout',

    // Announcements
    'GET_ANNOUNCEMENTS': '/get-announcements',
    'GET_USER_ANNOUNCEMENTS': '/get-user-announcements',
    'SUBMIT_ANNOUNCEMENT': '/submit-announcement',

    // Complaints
    'SUBMIT_COMPLAINT': '/submit-complaint',
    'GET_USER_COMPLAINTS': '/get-user-complaints',
    'DELETE_COMPLAINT': '/delete-complaint',
    'GET_COMPLAINTS': '/get-complaints',
 
    // Leave
    'APPLY_FOR_LEAVE': '/apply-for-leave',
    'GET_USER_LEAVES': '/get-user-leaves',
    'CANCEL_LEAVE': '/cancel-leave',
    'GET_LEAVES': '/get-leaves',

    // Meal Request
    'REQUEST_MEAL': '/request-meal',
    'GET_USER_MEAL_REQUESTS': '/get-user-meal-requests',
    'CANCEL_MEAL_REQUEST': '/cancel-meal-request',
    'GET_MEAL_REQUESTS': '/get-meal-requests',

    // Menu
    'GET_MESS_MENU': '/get-mess-menu',
    'UPDATE_MENU_ITEM': '/update-menu-item',
    'UPDATE_DAY_MENU': '/update-day-menu',
    'UPDATE_TIME_MENU': '/update-time-menu',

    // Room Change
    'REQUEST_ROOM_CHANGE': '/request-room-change',
    'GET_USER_ROOM_CHANGE_REQUESTS': '/get-user-room-change-requests',
    'CANCEL_ROOM_CHANGE_REQUEST': '/cancel-room-change-request',
    'GET_ROOM_CHANGE_REQUESTS': '/get-room-change-requests',
    'UPDATE_ROOM_CHANGE_STATUS': '/update-room-change-status',

    // Item Reports
    'REPORT_ITEM': '/report-item',
    'GET_USER_ITEM_REPORTS': '/get-user-item-reports',
    'CLOSE_LOST_REPORT': '/close-lost-report',
    'CLAIM_FOUND_ITEM': '/claim-found-item',

    // Feedback
    'SHARE_MESS_FEEDBACK': '/share-mess-feedback',
    'GET_MESS_FEEDBACK': '/get-mess-feedback',

    // Timings
    'GET_FACILITY_TIMINGS': '/get-facility-timings',
    'UPDATE_FACILITY_TIMING': '/update-facility-timing',
    'ADD_FACILITY_TIMING': '/add-facility-timing',
    'UPDATE_FACILITY_TIMINGS': '/update-facility-timings',
    'REMOVE_FACILITY_TIMING': '/remove-facility-timing',

    // Update status
    'UPDATE_STATUS': '/update-status',

    // Admin
    'GET_EMAIL_DOMAINS': '/get-email-domains',
    'ADD_EMAIL_DOMAIN': '/add-email-domain',
    'REMOVE_EMAIL_DOMAIN': '/remove-email-domain',
    'TOGGLE_EMAIL_DOMAIN': '/toggle-email-domain',
    'GET_ALL_USERS': '/get-all-users',
    'DELETE_USER': '/delete-user',
    'ADD_USER': '/add-user',
    'GET_USER_COMPLAINTS_BY_ROLL': '/get-user-complaints-by-roll',
    'GET_USER_LEAVES_BY_ROLL': '/get-user-leaves-by-roll',
    'GET_USER_MEAL_REQUESTS_BY_ROLL': '/get-user-meal-requests-by-roll',
    'GET_USER_ROOM_CHANGE_BY_ROLL': '/get-user-room-change-by-roll',
    'GET_USER_ITEM_REPORTS_BY_ROLL': '/get-user-item-reports-by-roll',
    'GET_USER_FEEDBACK_BY_ROLL': '/get-user-feedback-by-roll',
    'GET_USER_ANNOUNCEMENTS_BY_ID': '/get-user-announcements-by-id',
    'GET_CONFIG': '/get-config',
    'UPDATE_CONFIG': '/update-config',
    'GET_PENDING_USERS': '/get-pending-users',
    'UPDATE_USER_STATUS': '/update-user-status',

    // Analytics
    'ANALYTICS_OVERVIEW': '/analytics-overview',
    'ANALYTICS_COMPLAINTS': '/analytics-complaints',
    'ANALYTICS_LEAVES': '/analytics-leaves',
    'ANALYTICS_ROOM_CHANGE': '/analytics-room-change',
    'ANALYTICS_MEAL_REQUESTS': '/analytics-meal-requests',

    // Email settings
    'GET_EMAIL_SETTINGS': '/get-email-settings',
    'UPDATE_EMAIL_SETTINGS': '/update-email-settings'
  }
};