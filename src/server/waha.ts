import "@tanstack/react-start/server-only";

import { getHotelById } from "@/db/hotels";
import { claimWhatsappNotify, clearWhatsappNotified, listDevicePeopleByGuest, type PersonRow } from "@/db/people";
import { listDevices } from "@/db/devices";
import { formatStayDateTime, toWhatsAppChatId } from "@/lib/stay";

export type WahaConfig = {
  url: string;
  apiKey: string;
  session: string;
};

export function readWahaConfig(): WahaConfig {
  return {
    url: (process.env["WAHA_URL"] ?? "").trim().replace(/\/+$/, ""),
    apiKey: (process.env["WAHA_API_KEY"] ?? "").trim(),
    session: (process.env["WAHA_SESSION"] ?? "default").trim() || "default",
  };
}

export function isWahaConfigured(config = readWahaConfig()) {
  return Boolean(config.url);
}

function deviceLabel(device: { name: string; location: string | null }) {
  return device.location?.trim() || device.name;
}

export function guestFaceReadyMessage(input: {
  guestName: string;
  hotelName: string;
  devices: string[];
  checkIn: Date | string | null;
  checkOut: Date | string | null;
}) {
  const firstName = input.guestName.trim().split(/\s+/)[0] || "hóspede";
  const devices = input.devices.length ? input.devices : ["Face Max"];
  const equipmentLine =
    devices.length === 1
      ? `📷 *Equipamento:* ${devices[0]}`
      : `📷 *Equipamentos:*\n${devices.map((name) => `• ${name}`).join("\n")}`;
  return [
    `👋 Olá, *${firstName}*!`,
    "",
    "✅ *Cadastro facial concluído com sucesso!*",
    "",
    `🏨 *Hotel:* ${input.hotelName}`,
    equipmentLine,
    `➡️ *Check-in:* ${formatStayDateTime(input.checkIn)}`,
    `⬅️ *Check-out:* ${formatStayDateTime(input.checkOut)}`,
    "",
    "_Use o reconhecimento facial nos acessos do hotel durante a sua estadia._ ✨",
  ].join("\n");
}

export async function sendWahaText(chatId: string, text: string, config = readWahaConfig()) {
  if (!config.url) {
    throw new Error("Informe a URL do Waha em Configurações.");
  }
  const response = await fetch(`${config.url}/api/sendText`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(config.apiKey ? { "X-Api-Key": config.apiKey } : {}),
    },
    body: JSON.stringify({
      session: config.session,
      chatId,
      text,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(body.slice(0, 280) || `Waha retornou ${response.status}`);
  }
}

export async function notifyGuestFaceReady(person: PersonRow) {
  if (person.kind === "staff") return { sent: false as const };
  if (person.whatsapp_notified_at) return { sent: false as const };
  if (!isWahaConfigured()) return { sent: false as const };

  const hotel = await getHotelById(person.hotel_id);
  if (!hotel?.module_waha) return { sent: false as const };

  const chatId = toWhatsAppChatId(person.phone);
  if (!chatId) return { sent: false as const };

  const mappings = await listDevicePeopleByGuest(person.id);
  const syncedIds = mappings.filter((item) => item.face_synced).map((item) => item.device_id);
  if (syncedIds.length === 0) return { sent: false as const };

  const devices = await listDevices(person.hotel_id);
  const names = devices.filter((device) => syncedIds.includes(device.id)).map(deviceLabel);

  const claimed = await claimWhatsappNotify(person.id);
  if (!claimed) return { sent: false as const };

  try {
    await sendWahaText(
      chatId,
      guestFaceReadyMessage({
        guestName: person.name,
        hotelName: hotel?.name ?? "Hotel",
        devices: names,
        checkIn: person.check_in,
        checkOut: person.check_out,
      }),
    );
    return { sent: true as const };
  } catch (error) {
    await clearWhatsappNotified(person.id);
    return {
      sent: false as const,
      error: `${person.name}: WhatsApp — ${error instanceof Error ? error.message : "falha ao enviar"}`,
    };
  }
}
