export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "not_required":
      return "Payment not required";
    case "pay_at_facility":
      return "Pay at facility";
    case "paid":
      return "Paid online";
    case "pending":
      return "Payment pending";
    case "refunded":
      return "Refunded";
    case "included":
      return "Included in membership";
    default:
      return status.replaceAll("_", " ");
  }
}
