import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text } from "react-native";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true
    }).start(() => setToast(null));
  }, [fade]);

  const showToast = useCallback(
    ({ title, message, type = "info", duration = 2800 }) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }

      setToast({ title, message, type });
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true
      }).start();

      timer.current = setTimeout(hide, duration);
    },
    [fade, hide]
  );

  const value = useMemo(() => ({ showToast, hideToast: hide }), [hide, showToast]);
  const color = toast?.type === "error" ? "bg-red-600" : toast?.type === "success" ? "bg-[#00A85A]" : "bg-ink";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          className={`absolute left-5 right-5 top-14 rounded-2xl px-4 py-3 shadow-lg ${color}`}
          style={{ opacity: fade }}
        >
          <Pressable onPress={hide}>
            <Text className="text-base font-bold text-white">{toast.title}</Text>
            {toast.message && (
              <Text className="mt-1 text-sm leading-5 text-white">{toast.message}</Text>
            )}
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
