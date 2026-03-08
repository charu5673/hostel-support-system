import DashboardDefault from "../pages/DashboardDefault";
import MakeComplaint from "../pages/student dashboard pages/MakeComplaint";
import CheckComplaints from "../pages/student dashboard pages/CheckComplaintStatus";
import ApplyLeave from "../pages/student dashboard pages/ApplyLeave";
import CheckLeave from "../pages/student dashboard pages/CheckLeave";
import CheckMenu from "../pages/student dashboard pages/CheckMenu";
import ShareFeedback from "../pages/student dashboard pages/ShareFeedback";
import MealRequest from "../pages/student dashboard pages/MealRequest";
import CheckRequest from "../pages/student dashboard pages/CheckRequest";

export const DashboardPages = {
  'student': [
    DashboardDefault,
    MakeComplaint,
    CheckComplaints,
    ApplyLeave,
    CheckLeave,
    CheckMenu,
    ShareFeedback,
    MealRequest,
    CheckRequest
  ],
  'warden': [
    DashboardDefault
  ],
  'mess': [
    DashboardDefault
  ],
  'admin': [
    DashboardDefault
  ],
};