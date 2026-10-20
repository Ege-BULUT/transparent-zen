import type { ExtensionSettings } from "../types/ExtensionSettings";

export const DEFAULT_SETTINGS: ExtensionSettings["transparentZenSettings"] = {
	themeMode: "transparent",
	transparencyMode: "partial",
	transparencyAmount: 50,
	windowBackdrop: 0,
	enableWhitelist: false,
	lightweightTransparency: false,
	textColor: "#FFFFFF",
	primaryColor: "#82C7FF",
	backgroundColor: "rgb(17, 17, 17)",
	transparencyDepth: 2,
	backgroundImage: null,
	backgroundImageBrightness: 100,
	backgroundImageOpacity: 50,
	backgroundImageBlur: 4,
	disabledWebsites: [],
	blacklistedDomains: [],
	siteSpecificSettings: [],
};

export const THEME_MODES: Array<{ value: ExtensionSettings["transparentZenSettings"]["themeMode"]; label: string }> = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "transparent", label: "Transparent" },
];

export const WINDOW_BACKDROPS: Array<{ value: ExtensionSettings["transparentZenSettings"]["windowBackdrop"]; label: string }> = [
	{ value: 0, label: "Automatic" },
	{ value: 1, label: "Mica (light blur)" },
	{ value: 2, label: "Acrylic (strong blur)" },
	{ value: 3, label: "Mica Alt (darker tint)" },
];

export const GITHUB_ENDPOINTS = {
	LATEST_RELEASE: "https://api.github.com/repos/Ege-BULUT/transparent-zen/releases/latest",
};
