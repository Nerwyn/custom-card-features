export interface MdRipple extends HTMLElement {
	startPressAnimation: (e: TouchEvent) => void;
	endPressAnimation: () => void;
}
