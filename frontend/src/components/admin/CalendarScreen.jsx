import InquiriesScreen, {
  isPickupTicket,
  parseHourFromTimeSlot,
  parseTimeSlotMinutes,
  BUSINESS_HOURS,
  TIME_SLOT_PRESETS,
  layoutDayEvents
} from './InquiriesScreen'

export {
  isPickupTicket,
  parseHourFromTimeSlot,
  parseTimeSlotMinutes,
  BUSINESS_HOURS,
  TIME_SLOT_PRESETS,
  layoutDayEvents
}

export default function CalendarScreen(props) {
  return <InquiriesScreen {...props} initialViewMode="calendar" />
}

