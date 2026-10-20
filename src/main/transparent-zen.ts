import type { Browser } from "webextension-polyfill-ts";
import { getTransparencyLevels, isDomainEnabled, withDefaults } from "../shared/Helper";
import type { ContentScripts, SupportedWebsite } from "../types/ContentScripts";
import type { ExtensionSettings, SiteSpecificSetting } from "../types/ExtensionSettings";
import type { Message } from "../types/Message";
import { ColorScheme } from "./modules/ColorScheme";
import { DynamicTransparency } from "./modules/DynamicTransparency";
import { SupportedSite } from "./modules/SupportedSite";
import { WebInspector } from "./modules/WebInspector";

declare const browser: Browser;

const DYNAMIC_TRANSPARENCY_STYLES = "styles/shared/dynamic-transparency.css";

class TransparentZen {
	private dynamicTransparency: DynamicTransparency | undefined;
	private supportedSite: SupportedSite | undefined;
	private webInspector: WebInspector | undefined;
	private colorScheme = new ColorScheme();
	private transparentZenSettings: ExtensionSettings["transparentZenSettings"] | undefined;
	private siteSpecificSettings: SiteSpecificSetting | null = null;
	private matchesSupportedWebsite = false;

	constructor() {
		this.initLoadingScreen();
		// biome-ignore format: readability
		this.checkIfWebsiteAlreadySupported().then(contentScript => {
			browser.storage.local.get("transparentZenSettings").then(async (settings) => {
				this.transparentZenSettings = withDefaults((settings as ExtensionSettings).transparentZenSettings);
				this.matchesSupportedWebsite = Boolean(contentScript);
				this.applyThemeAttributes();
				// Hand-made site styles only exist for the transparent theme, light and dark use the generic engine
				if (!contentScript || this.transparentZenSettings.themeMode !== "transparent") {
					this.webInspector = new WebInspector(this.transparentZenSettings);
					this.dynamicTransparency = new DynamicTransparency(this.transparentZenSettings, this.removeLoadingScreen, this.initExtensionSettingsStyles.bind(this));
					if (this.transparentZenSettings.themeMode === "transparent") {
						await this.dynamicTransparency.initDynamicTransparency();
					} else {
						this.onDomReady(() => {
							this.applyColorScheme();
							this.removeLoadingScreen();
						});
					}
					this.initSiteSpecificSettings();
					this.initBrowserEvents();
				} else {
					console.info("Website is supported by Transparent Zen");
					this.supportedSite = new SupportedSite(this.transparentZenSettings, this.removeLoadingScreen, this.initExtensionSettingsStyles.bind(this), this.initBrowserEvents.bind(this));
					await this.supportedSite?.initSupportedWebsite(contentScript);
					this.initSiteSpecificSettings();
				}
			}).catch((error) => {
				console.error("Error checking supported websites:", error);
				this.removeLoadingScreen();
			});
		});
	}

	private checkIfWebsiteAlreadySupported(): Promise<SupportedWebsite | false> {
		const contentScriptsUrl = browser.runtime.getURL("data/ContentScripts.json");
		return new Promise((resolve) => {
			fetch(contentScriptsUrl).then(async (response) => {
				if (response.ok) {
					const data: ContentScripts = await response.json();
					const currentUrl = window.location.href;
					for (const script of data.supportedWebsites) {
						for (const match of script.matches) {
							const regex = new RegExp(match);
							if (regex.test(currentUrl)) {
								resolve(script as SupportedWebsite);
								break;
							}
						}
					}
				}
				resolve(false);
			});
		});
	}

	private applyCustomBackgrounds(): void {
		if (!this.siteSpecificSettings) return;

		if (this.siteSpecificSettings.backgroundSelectors.length) {
			let customStyles = document.getElementById("tz-custom-backgrounds") as HTMLStyleElement | null;
			if (!customStyles) {
				customStyles = document.createElement("style");
				customStyles.id = "tz-custom-backgrounds";
				document.head.append(customStyles);
			}
			customStyles.textContent = `
				${this.siteSpecificSettings.backgroundSelectors.join(",")} {
					background-color: transparent !important;

					&[data-tz-processed] {
						&[data-tz-depth] {
							background-color: transparent !important;
						}
					}
				}`;
		}
	}

	private applyCustomStyles(): void {
		if (!this.siteSpecificSettings) return;

		let customStyles = document.getElementById("tz-custom-styles") as HTMLStyleElement | null;
		if (!customStyles) {
			customStyles = document.createElement("style");
			customStyles.id = "tz-custom-styles";
			document.head.append(customStyles);
		}
		customStyles.textContent = this.siteSpecificSettings.customStyles;
	}

	private removeCustomStyles(): void {
		const customStyles = document.getElementById("tz-custom-styles") as HTMLStyleElement | null;
		customStyles?.remove();
	}

	private initBrowserEvents(): void {
		browser.runtime.onMessage.addListener((request: Message) => {
			switch (request.action) {
				case "changeTheme": {
					// Supported sites pick their stylesheet at load time, so a reload is the clean way to switch themes there
					if (this.matchesSupportedWebsite) {
						window.location.reload();
						break;
					}
					this.updateSettings(request.settings);
					this.applyTheme();
					break;
				}
				case "changeTransparency": {
					this.updateSettings(request.settings);
					this.applyThemeAttributes();
					break;
				}
				case "toggleInspector": {
					if (request.enabled) {
						this.webInspector?.enableInspector();
					} else {
						this.webInspector?.disableInspector();
					}
					break;
				}
				case "getDomain": {
					return Promise.resolve(window.location.hostname);
				}
				case "changePrimaryColor": {
					this.applyCustomProperty("--color-primary", request.value as string);
					break;
				}
				case "changeTextColor": {
					this.applyCustomProperty("--color-text", request.value as string);
					break;
				}
				case "changeBackgroundColor": {
					this.applyCustomProperty("--color-bg", request.value as string);
					break;
				}
				case "changeBackgroundImage": {
					if (request.value) {
						const backgroundImage = request.value as Blob;
						this.blobToDataURL(backgroundImage).then((dataUrl) => {
							this.applyCustomProperty("--custom-background-image", `url(${dataUrl})`);
							document.documentElement?.classList.add("tz-custom-background");
						});
					} else {
						this.applyCustomProperty("--custom-background-image", "none");
						document.documentElement?.classList.remove("tz-custom-background");
					}
					break;
				}
				case "changeBackgroundImageOpacity": {
					this.applyCustomProperty("--custom-background-image-opacity", ((request.value as number) / 100).toString());
					break;
				}
				case "changeBackgroundImageBlur": {
					this.applyCustomProperty("--custom-background-image-blur", `blur(${request.value}px)`);
					break;
				}
				case "changeBackgroundImageBrightness": {
					this.applyCustomProperty("--custom-background-image-brightness", `brightness(${(request.value as number) / 100})`);
					break;
				}
				case "changeCustomStyles": {
					if (this.siteSpecificSettings) {
						this.siteSpecificSettings.customStyles = request.value as string;
						this.applyCustomStyles();
					} else {
						browser.storage.local.get("transparentZenSettings").then((settings) => {
							this.transparentZenSettings = settings.transparentZenSettings;
							if (this.transparentZenSettings?.siteSpecificSettings.length) {
								for (const setting of this.transparentZenSettings.siteSpecificSettings) {
									if (setting.domain === window.location.hostname) {
										this.siteSpecificSettings = setting;
										this.applyCustomStyles();
									}
								}
							}
						});
					}
					break;
				}
				case "toggleSiteSpecificSettings": {
					const enabled = request.value as boolean;
					if (enabled) {
						this.applyCustomStyles();
					} else {
						this.removeCustomStyles();
					}
				}
			}
		});
	}

	private initLoadingScreen(): void {
		document.documentElement?.style.setProperty("--zen-logo-path", `url(${browser.runtime.getURL("assets/images/zen_logo.svg")})`);
		document.documentElement?.classList.add("tz-hidden");
	}

	private removeLoadingScreen(): void {
		setTimeout(() => {
			document.documentElement.classList.remove("tz-hidden");
			document.documentElement.style.removeProperty("--zen-logo-path");
		}, 500);
	}

	private async initSiteSpecificSettings(): Promise<void> {
		if (!this.transparentZenSettings) {
			const settings = (await browser.storage.local.get("transparentZenSettings")) as ExtensionSettings;
			this.transparentZenSettings = settings.transparentZenSettings;
		}

		if (this.transparentZenSettings?.siteSpecificSettings.length) {
			for (const setting of this.transparentZenSettings.siteSpecificSettings) {
				if (setting.domain === window.location.hostname) {
					this.siteSpecificSettings = setting;
					if (setting.enabled) {
						this.applyCustomBackgrounds();
						this.applyCustomStyles();
					}
				}
			}
		}
	}

	private initExtensionSettingsStyles(): void {
		document.documentElement.classList.add("tz-initialized");
		if (this.transparentZenSettings?.primaryColor) {
			this.applyCustomProperty("--color-primary", this.transparentZenSettings.primaryColor);
		}
		if (this.transparentZenSettings?.textColor) {
			this.applyCustomProperty("--color-text", this.transparentZenSettings.textColor);
		}
		if (this.transparentZenSettings?.backgroundColor) {
			this.applyCustomProperty("--color-bg", this.transparentZenSettings.backgroundColor);
		}
		if (this.transparentZenSettings?.backgroundImage) {
			this.blobToDataURL(this.transparentZenSettings.backgroundImage).then((dataUrl) => {
				this.applyCustomProperty("--custom-background-image", `url(${dataUrl})`);
				document.documentElement?.classList.add("tz-custom-background");
			});
			if (this.transparentZenSettings.backgroundImageOpacity) {
				const opacity = this.transparentZenSettings.backgroundImageOpacity / 100;
				this.applyCustomProperty("--custom-background-image-opacity", opacity.toString());
			}
			if (this.transparentZenSettings.backgroundImageBlur) {
				this.applyCustomProperty("--custom-background-image-blur", `blur(${this.transparentZenSettings.backgroundImageBlur}px)`);
			}
			if (this.transparentZenSettings.backgroundImageBrightness) {
				const brightness = this.transparentZenSettings.backgroundImageBrightness / 100;
				this.applyCustomProperty("--custom-background-image-brightness", `brightness(${brightness})`);
			}
		}
	}

	private blobToDataURL(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				resolve(reader.result as string);
			};
			reader.onerror = (error) => {
				reject(error);
			};
			reader.readAsDataURL(blob);
		});
	}

	private applyCustomProperty(property: string, color: string): void {
		document.documentElement.style.setProperty(property, color);
	}

	private updateSettings(settings: ExtensionSettings["transparentZenSettings"] | undefined): void {
		if (!settings || !this.transparentZenSettings) return;
		// Mutate in place because the modules hold a reference to the same settings object
		Object.assign(this.transparentZenSettings, withDefaults(settings));
	}

	private applyThemeAttributes(): void {
		const root = document.documentElement;
		const settings = this.transparentZenSettings;
		if (!settings || !isDomainEnabled(settings, window.location.hostname)) {
			delete root.dataset.tzTheme;
			delete root.dataset.tzTransparency;
			return;
		}

		const { backgroundAlpha, contentOpacity } = getTransparencyLevels(settings);
		root.dataset.tzTheme = settings.themeMode;
		root.dataset.tzTransparency = settings.transparencyMode;
		root.style.setProperty("--tz-background-alpha", backgroundAlpha.toString());
		root.style.setProperty("--tz-content-opacity", contentOpacity.toString());
	}

	private applyColorScheme(): void {
		const settings = this.transparentZenSettings;
		if (!settings || settings.themeMode === "transparent" || !isDomainEnabled(settings, window.location.hostname)) return;
		this.colorScheme.apply(settings.themeMode);
	}

	private applyTheme(): void {
		const settings = this.transparentZenSettings;
		if (!settings) return;

		this.dynamicTransparency?.removeTransparencyRules();
		this.colorScheme.clear();
		this.applyThemeAttributes();
		if (!isDomainEnabled(settings, window.location.hostname)) return;

		if (settings.themeMode === "transparent") {
			browser.runtime.sendMessage({ action: "insertStyles", filePath: DYNAMIC_TRANSPARENCY_STYLES });
			this.initExtensionSettingsStyles();
			if (!settings.lightweightTransparency) {
				this.dynamicTransparency?.processPage(true);
			}
		} else {
			this.applyColorScheme();
		}
	}

	private onDomReady(callback: () => void): void {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", callback, { once: true });
		} else {
			callback();
		}
	}
}

new TransparentZen();
