import { create } from "zustand";

import {
  createCustomerAddress,
  deleteCustomerAddress,
  listCustomerAddresses,
  updateCustomerAddress
} from "../services/addressService";
import { clearStoredAddress, loadStoredAddress, saveStoredAddress } from "../services/addressStorage";

export const defaultDeliveryAddress = {
  label: "Current location",
  address: "Karachi, Sindh, Pakistan",
  addressLine1: "Karachi, Sindh, Pakistan",
  addressLine2: "",
  city: "Karachi",
  state: "Sindh",
  postalCode: "",
  country: "PK",
  latitude: 24.8607,
  longitude: 67.0011
};

export function normalizeAddress(address) {
  if (!address) {
    return null;
  }

  const composedAddress = [address.addressLine1, address.city, address.state, address.country]
    .filter(Boolean)
    .join(", ");
  const coordinateAddress =
    typeof address.latitude !== "undefined" && typeof address.longitude !== "undefined"
      ? "Selected map location"
      : "";
  const formattedAddress = address.address || composedAddress || coordinateAddress;

  return {
    ...defaultDeliveryAddress,
    ...address,
    address: formattedAddress,
    addressLine1: address.addressLine1 || formattedAddress,
    latitude:
      typeof address.latitude === "number"
        ? address.latitude
        : Number(address.latitude) || defaultDeliveryAddress.latitude,
    longitude:
      typeof address.longitude === "number"
        ? address.longitude
        : Number(address.longitude) || defaultDeliveryAddress.longitude
  };
}

const useAddressStore = create((set, get) => ({
  address: defaultDeliveryAddress,
  savedAddresses: [],
  activeAddress: null,
  isLoading: false,
  error: null,
  hasUnsyncedAddress: false,
  setAddress: (address, options = {}) => {
    const nextAddress = normalizeAddress(address);
    saveStoredAddress(nextAddress).catch(() => {});
    set({
      address: nextAddress,
      hasUnsyncedAddress: options.unsynced ?? true
    });
  },
  loadPersistedAddress: async () => {
    const storedAddress = normalizeAddress(await loadStoredAddress());

    if (!storedAddress) {
      return null;
    }

    set({
      address: storedAddress,
      activeAddress: storedAddress,
      hasUnsyncedAddress: true
    });

    return storedAddress;
  },
  setFromProfile: (profile) => {
    const profileAddress =
      profile?.activeAddress ||
      profile?.customerProfile?.activeAddress ||
      profile?.customerProfile?.addresses?.[0] ||
      profile?.addresses?.[0] ||
      null;

    if (!profileAddress) {
      return;
    }

    const address = normalizeAddress(profileAddress);
    saveStoredAddress(address).catch(() => {});
    set({
      address,
      activeAddress: address,
      hasUnsyncedAddress: false
    });
  },
  clearError: () => set({ error: null }),
  loadAddresses: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await listCustomerAddresses();
      const savedAddresses = (data.addresses || []).map(normalizeAddress);
      const activeAddress = normalizeAddress(data.activeAddress || savedAddresses[0]);

      set({
        savedAddresses,
        activeAddress,
        address: activeAddress || get().address,
        hasUnsyncedAddress: false,
        isLoading: false
      });

      if (activeAddress) {
        saveStoredAddress(activeAddress).catch(() => {});
      }

      return data;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || error?.message || "Unable to load addresses"
      });
      throw error;
    }
  },
  syncSelectedAddress: async () => {
    const currentAddress = normalizeAddress(get().address);

    if (!currentAddress) {
      return null;
    }

    const payload = {
      label: currentAddress.label || "Home",
      address: currentAddress.address || currentAddress.addressLine1,
      addressLine1: currentAddress.addressLine1,
      addressLine2: currentAddress.addressLine2 || "",
      city: currentAddress.city || "",
      state: currentAddress.state || "",
      postalCode: currentAddress.postalCode || "",
      country: currentAddress.country || "PK",
      latitude: currentAddress.latitude,
      longitude: currentAddress.longitude,
      isActive: true
    };

    set({ isLoading: true, error: null });

    try {
      const data = currentAddress.id
        ? await updateCustomerAddress(currentAddress.id, payload)
        : await createCustomerAddress(payload);
      const activeAddress = normalizeAddress(data.address || payload);
      saveStoredAddress(activeAddress).catch(() => {});

      set({
        address: activeAddress,
        activeAddress,
        savedAddresses: [
          activeAddress,
          ...get().savedAddresses.filter((item) => item.id !== activeAddress.id)
        ],
        hasUnsyncedAddress: false,
        isLoading: false
      });

      return activeAddress;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || error?.message || "Unable to save address"
      });
      throw error;
    }
  },
  activateAddress: async (address) => {
    if (!address?.id) {
      const activeAddress = normalizeAddress(address);
      saveStoredAddress(activeAddress).catch(() => {});
      set({ address: activeAddress, activeAddress });
      return;
    }

    const data = await updateCustomerAddress(address.id, { isActive: true });
    const activeAddress = normalizeAddress(data.address || address);
    saveStoredAddress(activeAddress).catch(() => {});
    set({ address: activeAddress, activeAddress, hasUnsyncedAddress: false });
  },
  deleteAddress: async (addressId) => {
    const data = await deleteCustomerAddress(addressId);
    const activeAddress = normalizeAddress(data.activeAddress);
    if (activeAddress) {
      saveStoredAddress(activeAddress).catch(() => {});
    }
    set({
      savedAddresses: get().savedAddresses.filter((address) => address.id !== addressId),
      activeAddress,
      address: activeAddress || defaultDeliveryAddress
    });
  },
  resetAddressState: () => {
    clearStoredAddress().catch(() => {});
    set({
      address: defaultDeliveryAddress,
      savedAddresses: [],
      activeAddress: null,
      isLoading: false,
      error: null,
      hasUnsyncedAddress: false
    });
  }
}));

export default useAddressStore;
