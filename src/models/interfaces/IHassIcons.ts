export interface IconResources<
	T extends
		| ComponentIcons
		| PlatformIcons
		| ServiceIcons
		| TriggerIcons
		| ConditionIcons,
> {
	resources: Record<string, T>;
}

export type PlatformIcons = Record<
	string,
	Record<
		string,
		{
			state: Record<string, string>;
			range?: Record<string, string>;
			state_attributes: Record<
				string,
				{
					state: Record<string, string>;
					range?: Record<string, string>;
					default: string;
				}
			>;
			default: string;
		}
	>
>;

export type ComponentIcons = Record<
	string,
	{
		state?: Record<string, string>;
		range?: Record<string, string>;
		state_attributes?: Record<
			string,
			{
				state: Record<string, string>;
				range?: Record<string, string>;
				default: string;
			}
		>;
		default: string;
	}
>;

type ServiceIcons = Record<
	string,
	{ service: string; sections?: Record<string, string> }
>;

type TriggerIcons = Record<
	string,
	{ trigger: string; sections?: Record<string, string> }
>;

type ConditionIcons = Record<
	string,
	{ condition: string; sections?: Record<string, string> }
>;

export type IconCategory =
	'entity' | 'entity_component' | 'services' | 'triggers' | 'conditions';

export interface CategoryType {
	entity: PlatformIcons;
	entity_component: ComponentIcons;
	services: ServiceIcons;
	triggers: TriggerIcons;
	conditions: ConditionIcons;
}
