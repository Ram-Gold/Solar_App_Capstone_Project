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

export default function QuotesScreen(props) {
  return <InquiriesScreen {...props} initialViewMode="table" />
}

