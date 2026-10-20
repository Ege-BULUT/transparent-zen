import type { SupportedWebsite } from "./ContentScripts";

export type ExtensionSettings = {
	transparentZenSettings: {
		themeMode: ThemeMode;
		transparencyMode: TransparencyMode;
		transparencyAmount: number;
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

export type SiteSpecificSetting = {
	domain: string;
	enabled: boolean;
	backgroundSelectors: Array<string>;
	customStyles: string;
};
