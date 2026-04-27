import DashboardDefault from "../pages/DashboardDefault";
import ComplaintSubmission from "../pages/student dashboard pages/complaint/ComplaintSubmission";
import ComplaintCheck from "../pages/student dashboard pages/complaint/ComplaintCheck";
import LeaveSubmission from "../pages/student dashboard pages/leave/LeaveSubmission";
import LeaveCheck from "../pages/student dashboard pages/leave/LeaveCheck";
import MessMenuCheck from "../pages/student dashboard pages/menu/MessMenuCheck";
import MessFeedbackSubmission from "../pages/student dashboard pages/feedback/MessFeedbackSubmission";
import MealRequestSubmission from "../pages/student dashboard pages/meal-request/MealRequestSubmission";
import MealRequestCheck from "../pages/student dashboard pages/meal-request/MealRequestCheck";
import RoomChangeSubmission from "../pages/student dashboard pages/room-change/RoomChangeSubmission";
import RoomChangeCheck from "../pages/student dashboard pages/room-change/RoomChangeCheck";
import ItemReportSubmission from "../pages/student dashboard pages/item-report/ItemReportSubmission";
import ItemReportCheck from "../pages/student dashboard pages/item-report/ItemReportCheck";
import LostAndFound from "../pages/student dashboard pages/lost-and-found/LostAndFound";
import TimingsCheck from "../pages/student dashboard pages/timings/TimingsCheck";
import AnnouncementSubmission from "../pages/announcements/AnnouncementSubmission";
import AnnouncementsCheck from "../pages/announcements/AnnouncementsCheck";
import ComplaintView from "../pages/warden dashboard pages/complaints/ComplaintView";
import LeaveView from "../pages/warden dashboard pages/leaves/LeaveView";
import RoomChangeView from "../pages/warden dashboard pages/room change/RoomChangeView";
import TimingsView from "../pages/warden dashboard pages/timings/TimingsView";
import FeedbackView from "../pages/mess dashboard pages/feedback/FeedbackView";
import MealRequestView from "../pages/mess dashboard pages/meal requests/MealRequestView";
import MessMenuView from "../pages/mess dashboard pages/mess menu/MessMenuView";
import EmailDomainsView from "../pages/admin dashboard pages/email domains/EmailDomainsView";
import UsersView from "../pages/admin dashboard pages/users/UsersView";
import ConfigurationSet from "../pages/admin dashboard pages/configurations/ConfigurationSet";
import Overview from "../pages/admin dashboard pages/analytics/overview/Overview";
import ComplaintsAnalytics from "../pages/admin dashboard pages/analytics/complaints/ComplaintsAnalytics";
import LeavesAnalytics from "../pages/admin dashboard pages/analytics/leaves/LeavesAnalytics";
import RoomChangeAnalytics from "../pages/admin dashboard pages/analytics/room change/RoomChangeAnalytics";
import MealRequestsAnalytics from "../pages/admin dashboard pages/analytics/meal requests/MealRequestsAnalytics";
import Settings from "../pages/settings/SettingsPage";
import ApproveUsersView from "../pages/admin dashboard pages/approve users/ApproveUsersView";

export const DashboardPages = {
  'student': [
    DashboardDefault,
    ComplaintSubmission,
    ComplaintCheck,
    LeaveSubmission,
    LeaveCheck,
    MessMenuCheck,
    MessFeedbackSubmission,
    MealRequestSubmission,
    MealRequestCheck,
    RoomChangeSubmission,
    RoomChangeCheck,
    ItemReportSubmission,
    ItemReportCheck,
    LostAndFound,
    TimingsCheck,
    Settings
  ],
  'warden': [
    DashboardDefault,
    AnnouncementSubmission,
    AnnouncementsCheck,
    ComplaintView,
    LeaveView,
    RoomChangeView,
    TimingsView
  ],
  'mess': [
    DashboardDefault,
    AnnouncementSubmission,
    AnnouncementsCheck,
    FeedbackView,
    MealRequestView,
    MessMenuView
  ],
  'admin': [
    DashboardDefault,
    AnnouncementSubmission,
    AnnouncementsCheck,
    EmailDomainsView,
    ConfigurationSet,
    UsersView,
    ApproveUsersView,
    Overview,
    ComplaintsAnalytics,
    LeavesAnalytics,
    RoomChangeAnalytics,
    MealRequestsAnalytics
  ],
};