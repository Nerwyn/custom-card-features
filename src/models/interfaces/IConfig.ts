export interface IConfig {
	type: string;
	buttons: [
		{
			service: string;
			data?: {
				entity_id?: string;
				[key: string]: string | number | boolean | undefined;
			};
			icon?: string;
		},
	];
}
