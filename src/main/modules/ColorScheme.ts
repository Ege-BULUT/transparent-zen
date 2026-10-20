import type { ThemeMode } from "../../types/ExtensionSettings";

/**
 * Generic light and dark mode for any website.
 * Pages that already match the requested scheme are left untouched, the others get
 * inverted while media elements are inverted back so photos and videos keep their colors.
 */
export class ColorScheme {
	public apply(mode: Exclude<ThemeMode, "transparent">): void {
		const root = document.documentElement;
		const pageBackground = this.getPageBackground();
		const pageIsDark = this.getLuminance(pageBackground) < 0.4;
		const shouldInvert = mode === "dark" ? !pageIsDark : pageIsDark;

		root.toggleAttribute("data-tz-invert", shouldInvert);
		if (shouldInvert) {
			root.style.setProperty("--tz-page-background", pageBackground);
		}
	}

	public clear(): void {
		document.documentElement.removeAttribute("data-tz-invert");
		document.documentElement.style.removeProperty("--tz-page-background");
	}

	private getPageBackground(): string {
		for (const element of [document.body, document.documentElement]) {
			if (!element) continue;
			const color = window.getComputedStyle(element).backgroundColor;
			const channels = this.parseRgb(color);
			if (channels && channels[3] > 0) return color;
		}
		return this.getCanvasColor();
	}

	// Without an explicit background the page shows the Canvas color of its color-scheme (dark pages may rely on this)
	private getCanvasColor(): string {
		const probe = document.createElement("div");
		probe.style.cssText = "display: none; background-color: Canvas;";
		(document.body ?? document.documentElement).append(probe);
		const color = window.getComputedStyle(probe).backgroundColor;
		probe.remove();
		return color;
	}

	private parseRgb(color: string): [number, number, number, number] | null {
		const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
		if (!match) return null;
		return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
	}

	private getLuminance(color: string): number {
		const channels = this.parseRgb(color);
		if (!channels) return 1;
		const [r, g, b] = channels.slice(0, 3).map((channel) => {
			const normalized = channel / 255;
			return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}
}
