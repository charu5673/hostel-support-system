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
    'UPDATE_STATUS': '/update-status'
  }
};