import { create } from "zustand";

export const defaultDeliveryAddress = {
  addressLine1: "221B Baker Street",
  addressLine2: "Apartment 4",
  city: "Karachi",
  state: "Sindh",
  postalCode: "74000",
  country: "PK",
  latitude: 24.8607,
  longitude: 67.0011,
  deliveryRadiusKm: 5
};

const useAddressStore = create((set) => ({
  address: defaultDeliveryAddress,
  setAddress: (address) => set({ address })
}));

export default useAddressStore;
