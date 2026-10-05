import { Capacitor, registerPlugin } from "@capacitor/core";

export type PhoneCallStatus = "idle" | "ringing" | "dialing" | "active";

export interface PhoneState {
  available: boolean;
  isDefaultDialer: boolean;
  status: PhoneCallStatus;
  number: string;
  speakerOn: boolean;
}

interface PluginListener {
  remove: () => Promise<void> | void;
}

interface PhonePlugin {
  getState(): Promise<PhoneState>;
  requestDefaultDialer(): Promise<{ requested: boolean }>;
  call(options: { number: string }): Promise<void>;
  answer(): Promise<void>;
  reject(): Promise<void>;
  hangUp(): Promise<void>;
  setSpeaker(options: { enabled: boolean }): Promise<{ speakerOn: boolean }>;
  addListener(
    event: "callStateChanged",
    callback: (state: PhoneState) => void,
  ): Promise<PluginListener> | PluginListener;
}

const CarPhone = registerPlugin<PhonePlugin>("CarPhone");

function plugin(): PhonePlugin | null {
  if (typeof window === "undefined") return null;
  return Capacitor.isNativePlatform() ? CarPhone : null;
}

export const isPhoneAvailable = () => plugin() !== null;

export async function getPhoneState(): Promise<PhoneState> {
  const native = plugin();
  if (!native)
    return {
      available: false,
      isDefaultDialer: false,
      status: "idle",
      number: "",
      speakerOn: false,
    };
  return native.getState();
}

export async function requestDefaultDialer() {
  return plugin()?.requestDefaultDialer();
}

export async function placeCall(number: string) {
  const cleaned = number.replace(/[^0-9+*#]/g, "");
  if (!cleaned) throw new Error("Digite um número válido.");
  await plugin()?.call({ number: cleaned });
}

export async function answerCall() {
  await plugin()?.answer();
}
export async function rejectCall() {
  await plugin()?.reject();
}
export async function hangUpCall() {
  await plugin()?.hangUp();
}
export async function setSpeaker(enabled: boolean) {
  await plugin()?.setSpeaker({ enabled });
}

export function onPhoneStateChanged(callback: (state: PhoneState) => void): () => void {
  const native = plugin();
  if (!native) return () => {};
  const handle = Promise.resolve(native.addListener("callStateChanged", callback));
  return () => {
    void handle.then((listener) => listener.remove());
  };
}
