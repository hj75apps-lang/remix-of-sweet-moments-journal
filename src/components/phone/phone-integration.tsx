import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { getPendingPhoneScreen, getPhoneState, isPhoneAvailable, onPhoneScreenRequested, onPhoneStateChanged, type PhoneState } from "@/services/phone";
import { onLauncherResumed } from "@/services/launcher-system";

/** Dial intents and incoming calls must reach the phone screen from every route. */
export function PhoneIntegration() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const pathRef = useRef(path);
  pathRef.current = path;
  useEffect(() => {
    if (!isPhoneAvailable()) return;
    let gone = false;
    let previousStatus = "idle";
    const receive = (state: PhoneState) => {
      if (!gone && state.status !== "idle" && state.status !== previousStatus && pathRef.current !== "/telefone") {
        void navigate({ to: "/telefone", search: { number: "" } });
      }
      previousStatus = state.status;
    };
    const pending = async () => {
      try {
        const request = await getPendingPhoneScreen();
        if (!gone && request.requested) void navigate({ to: "/telefone", search: { number: request.number } });
      } catch { /* retry at next native resume */ }
    };
    const refresh = () => {
      void pending();
      void getPhoneState().then((state) => { if (!gone) receive(state); }).catch(() => undefined);
    };
    const stopState = onPhoneStateChanged(receive);
    const stopIntent = onPhoneScreenRequested(() => void pending());
    const stopResume = onLauncherResumed(refresh);
    refresh();
    return () => { gone = true; stopState(); stopIntent(); stopResume(); };
  }, [navigate]);
  return null;
}
