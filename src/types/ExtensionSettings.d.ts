import type { SupportedWebsite } from "./ContentScripts";

export type ExtensionSettings = {
	transparentZenSettings: {
		themeMode: ThemeMode;
		transparencyMode: TransparencyMode;
		transparencyAmount: number;
		windowBackdrop: WindowBackdrop;
		lightweightTransparency: boolean;
		enableWhitelist: boolean;
		textColor: string;
		primaryColor: string;
		backgroundColor: string;
		transparencyDepth: number | null;
		backgroundImage: File | Blob | null;
		backgroundImageBlur: number;
		backgroundImageOpacity: number;
		backgroundImageBrightness: number;
		disabledWebsites: Array<SupportedWebsite>;
		blacklistedDomains: Array<string>;
		siteSpecificSettings: Array<SiteSpecificSetting>;
	};
};

export type ThemeMode = "light" | "dark" | "transparent";

export type TransparencyMode = "partial" | "full";

/** Values of the widget.windows.mica.toplevel-backdrop preference */
export type WindowBackdrop = 0 | 1 | 2 | 3;

export type SiteSpecificSetting = {
	domain: string;
	enabled: boolean;
	backgroundSelectors: Array<string>;
	customStyles: string;
};
