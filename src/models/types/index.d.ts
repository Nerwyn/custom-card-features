export {};

declare global {
	interface Window {
		customCardFeatures: CustomCardFeature[];
		customCards: CustomCard[];
	}

	interface CustomCardFeature {
		type: string;
		name: string;
		configurable?: boolean;
		supported?: () => boolean;
	}

	interface CustomCard {
		type: string;
		name: string;
		description: string;
	}

	interface Event {
		// eslint-disable-next-line
		detail?: any;
	}
}
