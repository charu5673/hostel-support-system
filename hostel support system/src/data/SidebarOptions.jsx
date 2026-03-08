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
    { name: 'View reported items', id: 12 },
    ]
  },
  {
    name: 'Timings',
    svg: <TimingsSVG />,
    actions: [
    { name: 'View hostel facilities timings', id: 13 },
    ]
  }
  ];