export const ADDRESS_LABEL_OPTIONS = ["Home", "Office", "Other"];

export function addressLabelIcon(label = "") {
  const normalized = String(label).toLowerCase();

  if (normalized.includes("office") || normalized.includes("work")) {
    return "business-outline";
  }

  if (normalized.includes("home")) {
    return "home-outline";
  }

  return "location-outline";
}

export function addressDisplayLine(address) {
  return address?.address || address?.addressLine1 || "Delivery address";
}

export function addressSubtitleLine(address) {
  return [address?.addressLine2, address?.city, address?.state].filter(Boolean).join(", ");
}
