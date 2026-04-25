import { ComplaintSVG, LeaveSVG, MessSVG, RoomSVG, LostAndFoundSVG, TimingsSVG } from "./SidebarIcons";

export const studentOptions = [
  {
    name: 'Complaints',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'Submit a complaint', id: 1 },
    { name: 'Check complaint status', id: 2 }
    ]
  },
  {
    name: 'Leave',
    svg: <LeaveSVG />,
    actions: [
    { name: 'Apply for leave', id: 3 },
    { name: 'Check leave application status', id: 4 }
    ]
  },
  {
    name: 'Mess',
    svg: <MessSVG />,
    actions: [
    { name: 'Check menu', id: 5 },
    { name: 'Share feedback', id: 6 },
    { name: 'Request for alternative food', id: 7 },
    { name: 'Check request status', id: 8}
    ]
  },
  {
    name: 'Room',
    svg: <RoomSVG />,
    actions: [
    { name: 'Apply for room change', id: 9 },
    { name: 'Check room change status', id: 10 },
    ]
  },
  {
    name: 'Lost and Found',
    svg: <LostAndFoundSVG />,
    actions: [
    { name: 'Report an item', id: 11 },
    { name: 'Your reports', id: 12 },
    { name: 'View reported items', id: 13 },
    ]
  },
  {
    name: 'Timings',
    svg: <TimingsSVG />,
    actions: [
    { name: 'View hostel facilities timings', id: 14 },
    ]
  }
];

export const wardenOptions = [
  {
    name: 'Announcements',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'Make an announcement', id: 1 },
    { name: 'View your announcements', id: 2 }
    ]
  },
  {
    name: 'Complaints',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'View complaints', id: 3 },
    ]
  },
  {
    name: 'Leaves',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'View leave applications', id: 4 },
    ]
  },
  {
    name: 'Room Change',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'View room change requests', id: 5 },
    ]
  },
  {
    name: 'Timings',
    svg: <TimingsSVG />,
    actions: [
      { name: 'Manage facility timings', id: 6 }
    ]
  }
];

export const messOptions = [
  {
    name: 'Announcements',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'Make an announcement', id: 1 },
    { name: 'View your announcements', id: 2 }
    ]
  },
  {
    name: 'Feedback',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'View mess feedback', id: 3 }
    ]
  },
  {
    name: 'Meal requests',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'View meal requests', id: 4 }
    ]
  },
  {
    name: 'Mess menu',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'Update mess menu', id: 5 }
    ]
  },
];

export const adminOptions = [
  {
    name: 'Announcements',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'Make an announcement', id: 1 },
    { name: 'View your announcements', id: 2 }
    ]
  },
  {
    name: 'Configurations',
    svg: <ComplaintSVG />,
    actions: [
    { name: 'Valid email domains', id: 3 },
    { name: 'Student requests limitations', id: 4}
    ]
  },
  {
    name: 'Users',
    svg: <ComplaintSVG />,
    actions: [
      {
        name: 'View users',
        id: 5
      }
    ]
  },
];