import TicketManagementView from '../../components/TicketManagementView';

export default function MyAssignedTicketsPage() {
  return (
    <TicketManagementView
      title="My Assigned Tickets"
      assignedOnly
      showExport={false}
    />
  );
}
