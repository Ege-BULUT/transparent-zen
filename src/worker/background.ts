import type { Browser } from "webextension-polyfill-ts";
import { getTransparencyLevels, withDefaults } from "../shared/Helper";
import { BROWSER_STORAGE_KEY, loadSettings } from "../shared/StorageHelper";
import type { ExtensionSettings } from "../types/ExtensionSettings";
import type { Message } from "../types/Message";

declare const browser: Browser;

browser.runtime.onMessage.addListener((message: Message) => {
	switch (message.action) {
		case "insertStyles": {
			applyStyles(message.filePath, message.domains);
			break;
		}

		case "removeStyles": {
			removeStyles(message.filePath);
			break;
		}
	}
});

async function applyStyles(filePath?: string, domains?: Array<string>): Promise<void> {
	const tabs = await browser.tabs.query({ currentWindow: true });

	for (const tab of tabs) {
		if (!tab.id || !tab.url) continue;
		if (tab.discarded) continue;
		if (tabs.length > 40 && !tab.active) continue;
		if (domains) {
			for (const domain of domains) {
				const regex = new RegExp(domain);
				if (tab.url && regex.test(tab.url)) {
					browser.tabs.insertCSS(tab.id, { file: filePath });
				}
			}
		} else if (!tab.url.startsWith("moz-extension://")) {
			browser.tabs.insertCSS(tab.id, { file: filePath });
		}
	}
}

async function removeStyles(filePath?: string): Promise<void> {
	const tabs = await browser.tabs.query({ currentWindow: true });

	for (const tab of tabs) {
		browser.tabs.removeCSS(tab.id, { file: filePath });
	}
}

/**
 * Zen ignores theme colors in its own UI, so the theme is only used as a channel to the companion
 * userChrome.css (zen-mod/userChrome.css), which reads the value back from --lwt-accent-color.
 * Firefox drops the alpha of the frame color, so the browser UI opacity is encoded in the red channel.
 */
async function syncBrowserTheme(storedSettings: ExtensionSettings["transparentZenSettings"] | undefined): Promise<void> {
	const settings = withDefaults(storedSettings);
	if (settings.themeMode !== "transparent") {
		await browser.theme.reset();
		return;
	}

	const { backgroundAlpha } = getTransparencyLevels(settings);
	await browser.theme.update({
		colors: { frame: `rgb(${Math.round(backgroundAlpha * 255)}, 0, 0)` },
		// Keep the browser following the system scheme instead of guessing it from the encoded color
		properties: { color_scheme: "system", content_color_scheme: "system" },
	} as Parameters<typeof browser.theme.update>[0]);
}

browser.storage.onChanged.addListener((changes, area) => {
	if (area === "local" && changes[BROWSER_STORAGE_KEY]) {
		syncBrowserTheme(changes[BROWSER_STORAGE_KEY].newValue);
	}
});

loadSettings().then((settings) => syncBrowserTheme(settings ?? undefined));
