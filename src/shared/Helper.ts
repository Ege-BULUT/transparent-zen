import type { ExtensionSettings } from "../types/ExtensionSettings";
import { DEFAULT_SETTINGS } from "./Constants";

export const isValidColor = (color: string): boolean => {
	const style = new Option().style;
	style.color = color;
	return style.color !== "";
};

export const getValidColorOrFallback = (color: string | undefined, fallback: string): string => {
	if (color && isValidColor(color)) {
		return color;
	}

	return fallback;
};

export const isDomainEnabled = (settings: ExtensionSettings["transparentZenSettings"], hostname: string): boolean => {
	const isListed = settings.blacklistedDomains?.includes(hostname) ?? false;
	return settings.enableWhitelist ? isListed : !isListed;
};

export const withDefaults = (settings: Partial<ExtensionSettings["transparentZenSettings"]> | null | undefined): ExtensionSettings["transparentZenSettings"] => {
	return { ...DEFAULT_SETTINGS, ...settings };
};

// Opacity values derived from the transparency slider (0 = opaque, 100 = fully see-through)
export const getTransparencyLevels = (settings: ExtensionSettings["transparentZenSettings"]) => {
	const amount = Math.min(100, Math.max(0, settings.transparencyAmount)) / 100;
	return {
		backgroundAlpha: 1 - amount,
		contentOpacity: settings.transparencyMode === "full" ? Math.max(0.15, 1 - amount * 0.85) : 1,
	};
};
