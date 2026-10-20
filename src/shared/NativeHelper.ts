import type { Browser } from "webextension-polyfill-ts";

declare const browser: Browser;

// Registered by native-host/install.ps1, extensions cannot change about:config or restart the browser themselves
const NATIVE_HOST = "transparent_zen";
const BACKDROP_PREF = "widget.windows.mica.toplevel-backdrop";

type NativeResponse = { ok: boolean; error?: string };

/** Writes the window backdrop preference and restarts Zen. Returns an error message, or null on success. */
export const applyWindowBackdrop = async (value: number): Promise<string | null> => {
	try {
		const result = (await browser.runtime.sendNativeMessage(NATIVE_HOST, { action: "setPref", name: BACKDROP_PREF, value })) as NativeResponse;
		if (!result.ok) return result.error ?? "The helper could not save the setting.";
		await browser.runtime.sendNativeMessage(NATIVE_HOST, { action: "restart" });
		return null;
	} catch {
		return "The native helper is not installed. Run native-host/install.ps1 once, then try again.";
	}
};
