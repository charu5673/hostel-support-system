import DashboardDefault from "../pages/DashboardDefault";
import MakeComplaint from "../pages/student dashboard pages/MakeComplaint";
import CheckComplaints from "../pages/student dashboard pages/CheckComplaintStatus";
import ApplyLeave from "../pages/student dashboard pages/ApplyLeave";
import CheckLeave from "../pages/student dashboard pages/CheckLeave";
import CheckMenu from "../pages/student dashboard pages/CheckMenu";
import ShareFeedback from "../pages/student dashboard pages/ShareFeedback";
import MealRequest from "../pages/student dashboard pages/MealRequest";
import CheckRequest from "../pages/student dashboard pages/CheckRequest";
import RoomChange from "../pages/student dashboard pages/RoomChange";
import CheckRoomChange from "../pages/student dashboard pages/CheckRoomChange";
import ReportItem from "../pages/student dashboard pages/ReportItem";
import CheckItemReports from "../pages/student dashboard pages/CheckItemReports";
import ViewItems from "../pages/student dashboard pages/ViewItems";

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
    CheckRequest,
    RoomChange,
    CheckRoomChange,
    ReportItem,
    CheckItemReports,
    ViewItems
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