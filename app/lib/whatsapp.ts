type Lead = {
  name: string;
  phone?: string;
  status: string;
  requirement?: string;
};

export function formatPhoneForWhatsApp(phone: string): string {
  // Strip everything except digits
  let digits = phone.replace(/\D/g, "");

  // Remove leading 0 (common in Indian numbers typed as 09876...)
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Add country code 91 if not already present
  if (!digits.startsWith("91") || digits.length === 10) {
    digits = "91" + digits.slice(-10);
  }

  return digits;
}

export function generateWhatsAppUrl(lead: Lead): string | null {
  if (!lead.phone) return null;

  const phone = formatPhoneForWhatsApp(lead.phone);
  const req = lead.requirement ? `about ${lead.requirement}` : "about a property";

  let message: string;

  if (lead.status === "new") {
    message = `Hi ${lead.name}, I'm Ashok from Clickbric. I saw you were enquiring ${req}. Would love to help — when's a good time to talk?`;
  } else if (["contacted", "qualified", "proposal"].includes(lead.status)) {
    message = `Hi ${lead.name}, Ashok here from Clickbric. Just following up on your enquiry ${req}. Do you have any questions?`;
  } else if (lead.status === "won") {
    message = `Hi ${lead.name}, Ashok from Clickbric. Congratulations! Let me know if you need anything further.`;
  } else {
    message = `Hi ${lead.name}, Ashok here from Clickbric. Just wanted to check in — do you have any questions?`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
