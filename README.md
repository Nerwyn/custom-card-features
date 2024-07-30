# Custom Features for Tile Cards and More

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)
![Project Maintenance][maintenance-shield]
[![GitHub Activity][last-commit-shield]][commits]
[![Community Forum][forum-shield]][forum]

[![Github][github]][github]

[![My Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?repository=service-call-tile-feature&owner=Nerwyn&category=Plugin)

_Formerly called Service Card Tile Feature_

Call any service and most [actions](https://www.home-assistant.io/dashboards/actions/) via card features. These custom features will let you create super customizable buttons, sliders, selectors, and spinboxes. [The Home Assistant developers gave us the ability to create custom features](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/#tile-features), why is no one else taking advantage of it? And why isn't something like a generic button feature already in Home Assistant? I don't know but here it is.

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/example_tile.png" alt="example_tile" width="600"/>

# Feature Types

## Buttons

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/buttons_tile.png" alt="buttons_tile" width="600"/>

Buttons are the most basic type of custom feature, being based on the example provided in the Home Assistant developer documentation. In addition to tap actions, buttons also support double tap actions, hold actions, and an alternate momentary button mode. All of these are described in further detail below. Buttons (like most features) can be given an icon and label, and further stylized with custom CSS.

## Selectors

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/selector_tile.png" alt="selector_tile" width="600"/>

Selectors allow you to create a row of custom button features with no gaps of which the currently active one will be highlighted, similar to those available for alarm control panel and thermostat modes. Like all features in this project it can be used for any action. Selectors do not have an overall icon or label, but each option has their own appearance fields.

After adding a selector to your custom features row, you will see nothing! This is because you need to define the options to be listed out in the selector manually. Each of these options is actually a custom button feature.

This feature works best with Home Assistant `select/input_select` entities. By setting the feature entity to one of these domains and leaving autofill entity enabled, any options you add will automatically have the ordered option from the select entity in both the `option` and service call data filled in along with the `select_option` service call information. While the option fields and service call information will autofill, you still have to click the add option button and give them appearance information so that they will render and be distinguishable (you'll know that you've added all possible options when the last option you add has the text `Option` instead of a different value).

Since each selector option is a custom feature button, you can override it's default behavior by changing it's tap action. Doing so will also break the default current option highlighting logic, but you can use the `Option` field within an option alongside to restore this. `Option` will be the value to compare against the feature's value, whether that is it's entity's state or one of it's attributes. If they match and are not undefined, then the the option will be highlighted. The option highlight color defaults to the parent card color (usually the tile card color), but can be changed by setting the CSS attribute `--color` to a different value, either for the entire feature or an individual option.

## Sliders

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/slider_tile.png" alt="slider_tile" width="600"/>

Sliders are input range elements made to look similar to the sliders found in Home Assistant default card features, similar to those available for light brightness and temperature. By default the slider will look like a normal tile light brightness or cover position slider, but you can change this to a few of other thumb styles using the `Thumb Type` appearance option.

Sliders can track either the state or attribute of an entity, meaning that when that entity's state or attribute changes so will the slider to match. By default it will track the `state` of an entity. To change this, set `Attribute` to the name of the attribute you want the slider to track. In order to pass the the slider's value to a service call, set the value in the service call data to `{{ value | float }}`.

By default the slider's range will be from 0 to 100, with a step size of 1. You will need to adjust this depending on the service you are calling. If you find that the service you are calling does not like non-whole numbers (like `light.turn_on` with `color_temp`), make sure to set step size to a whole number and to use the `int` filter in the action data template.

To prevent value bouncing, sliders will wait for one second before retreiving an updated value from Home Assistant after it's action is called. This time can be changed by changing `Update After Action Delay`.

## Spinboxes

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/spinbox_tile.png" alt="spinbox_tile" width="600"/>

Spinboxes allow you to create Home Assistant style number boxes with increment and decrement buttons, similar to the climate target temperature feature. By default the user can increment or decrement this feature's internal value using the corresponding buttons. Once the user stops pressing the buttons for a time period defined by `Debounce Time` (default 1000ms), the user defined tap action will fire. Similar to sliders, spinboxes will wait one second before updating it's internal value but this can be changed using `Update After Action Delay`.

Like sliders, the spinbox's action should use a service which sets a value similar to `number/input_number.set_value` or `climate.set_temperature` and the user should use `value` in a template to pass it to the action call. This way the user can keep incrementing or decrementing the value until they reach the desired value, and the action to update it in Home Assistant is only called once. You can make this features buttons repeat when held by setting the hold action to repeat. These should all be set in the `CENTER` tab of the spinbox configuration page.

You can also override the default behavior of the increment and decrement buttons by changing the tab bar to `INCREMENT` or `DECREMENT` and modifying the actions there. Doing so will disable the normal increment/decrement and debounce button behavior and create a button feature instead. Spinbox button appearance and styles can also be modified more directly in the `INCREMENT` and `DECREMENT` tabs.

# How To Use

This project now has a fully featured configuration user interface! To get started, install this project using HACS by adding it as a custom frontend repository. Then go to a dashboard.

Create a tile card, or any other card that supports card features. The entity ID can be anything you like. Click `ADD FEATURE` and then `Custom Features Row`

All custom features are encapsulated in a custom features row. This allows you to add multiple custom features to a row, apply overall CSS styles, and change the widths of features in the row relative to each other using the `flex-basis` CSS property. You can add a custom features row just like any default feature, except that this feature is available for all entities.

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/add_custom_features_row.png" alt="add_custom_features_row" width="600"/>

Within a custom features row you can add individual features using the add custom feature button. This works just like the top level add feature button but just for custom features. Each feature will look like a blank rectangle to start. Features can be reordered, edited, and deleted from here.

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/add_custom_feature.png" alt="add_custom_feature" width="600"/>

You can also add CSS styles for the entire row here. CSS styles have to be encapsulated in a CSS selector like so.

```css
:host {
  --mdc-icon-size: 32px;
}
```

By default, features will autofill with it's parent's entity information for tracking it's internal state. This can be disabled by toggling `Autofill Entity` off at the feature level. Haptics can be similary enabled for a feature.

## General Options

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/basic_feature_options.png" alt="basic_feature_options" width="600"/>

Every feature can have an entity assigned to it, which is used to track it's internal value. This value can then be used in styles and actions using templates, like `{{ value | float }}` By default the value will be derived from the entity state, but it can be changed to an attribute use the corresponding field.

Some additional logic is applied for certain attributes:

- `brightness` - Converted from the default range of 0-255 to 0-100.
- `media_position` - Updated twice a second using the current timestamp and the attribute `media_position_updated_at` when the entity state is `playing`, and locked to a max value using the attribute `media_duration`.
- `elapsed` - Only for timer entities. Updated twice a second using the the current timestamp and the attributes `duration`, `remaining`, and `finishes_at`, and locked to a max value using the attribute `duration`.
  - _NOTE_: `elapsed` is not an actual attribute of timer entities, but is a possible `value_attribute` for timer entities for the purpose of displaying accurate timer elapsed values. Timer entities do have an attribute `remaining`, which only updates when the timer state changes. The actual `remaining` attribute can be calculated using the `elapsed` value and the timer `duration` attribute.

If you find that the autofilling of the entity ID in the service call or tile feature value is causing issues, setting `Autofill Entity` to `false` may help. Just remember to set the entity ID of the feature and the entity, device, area, or label ID of the action target.

Haptics are disabled for features by default, but can be toggled on at the feature level.

### Slider and Spinbox General Options

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/slider_spinbox_general_options.png" alt="slider_spinbox_general_options" width="600"/>

Sliders and spinboxes have some additional general options. Both can have range `Min` and `Max` values defined by the user, but default to 0 and 100. Both can also have a `Step` size defined, which defaults to 1.

Sliders and spinboxes will wait one second before updating their internal values from Home Assistant. This time can be changed by setting `Update After Action Delay`. Spinboxes will wait to fire their actions until a set amount of time after their buttons have stopped being pressed. This time defaults to one second and can be changed by setting `Debounce Time`.

## Appearance

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/appearance_options.png" alt="appearance_options" width="600"/>

All features (except for selectors, which support these options at the option level) can have a `Label`, `Icon`, and `Units`. These fields can also be set using templates. Like the overall custom features row, each custom feature can have it's CSS styles set (including using templates).

### A Note on Templating

Almost all fields support nunjucks templating. Nunjucks is a templating engine for JavaScript, which is heavily based on the jinja2 templating engine for Python which Home Assistant uses. While the syntax of nunjucks and jinja2 is almost identical, you may find the [nunjucks documentation](https://mozilla.github.io/nunjucks/templating.html) useful. Not all functions supported by Home Assistant templates are supported by this templating system. Please see the [ha-nunjucks](https://github.com/Nerwyn/ha-nunjucks) repository for a list of available functions. If you want additional functions to be added, please make a feature request on that repository, not this one.

You can include the current value of a tile feature and it's units by using the variables `value` and `unit` in a label template. You can also include `hold_secs` in a template if performing a momentary end action. Each custom feature can also reference it's entry using `config` within templates. `config.entity` and `config.attribute` will return the features entity ID and attribute with their templates rendered (if they have them), and other templated config fields can be rendered within templates by wrapping them in the function `render` within a template.

### CSS Styles

The custom features row and each custom feature within it has a code box for entering [CSS](https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/CSS_basics) styles.

General style options and custom feature specific properties can be set within the `:host` selector. **You cannot set styles outside of a CSS selector**.

```css
:host {
  --color: red;
  --icon-color: blue;
  flex-basis: 200%;
}
```

All sub-elements within a custom feature are given easy to remember classes to apply additional styles to.

| Class Name  | Element                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| .row        | The custom features row that all custom features are contained within.      |
| .container  | A container within the custom feature to keep things organized.             |
| .background | The background of the custom feature.                                       |
| .icon       | The icon of the custom feature.                                             |
| .label      | The label of the custom feature.                                            |
| .slider     | The input range slider element.                                             |
| .tooltip    | The slider tooltip, which appears when the slider is being interacted with. |

```css
.background {
  background: blue;
}
.icon {
  --mdc-icon-size: 32px;
}
.label {
  color: red;
}
.tooltip {
  --tooltip-label: '{{ (value / 60) | int }}:{{ 0 if (value - 60*((value / 60) | int)) < 10 else "" }}{{ (value - 60*((value / 60) | int)) | int }}';
}
```

While any CSS property can be used, these values are internal CSS attributes used by custom features. You can choose to either use these values or to set these fields directly using class selectors for each sub-element.

| Name                     | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| flex-basis               | Percentage of the row the the feature should populate relative to it's siblings. Defaults to `100%`.    |
| --feature-height         | Height of the features. Defaults to 40px (pre 2024.8.0) or 42px (2024.8.0 or later).                    |
| --feature-button-spacing | The gap between custom features. Defaults to 12px.                                                      |
| --color                  | Color of the custom feature. Can also be a CSS function.                                                |
| --opacity                | Opacity of the custom feature. Defaults to 0.2.                                                         |
| --icon-color             | Color of the icon.                                                                                      |
| --label-color            | Color of the string label.                                                                              |
| --icon-filter            | Filter to apply to the icon color.                                                                      |
| --label-filter           | Filter to apply to the string label color.                                                              |
| --background             | Color for the custom feature background. Sometimes equivalent to `--color`. Can also be a CSS function. |
| --background-opacity     | Opacity of the tile feature background. Defaults to 0.2.                                                |

#### Slider CSS Attributes

| Name                  | Description                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| --thumb-width         | Width of the actual slider thumb, not including box shadow. Default varies by thumb style and browser. |
| --thumb-border-radius | Border radius of the slider thumb. Default varies by thumb style.                                      |
| --thumb-box-shadow    | Box shadow of the slider thumb. Default varies by thumb style.                                         |
| --tooltip-label       | Tooltip label template, defaults to `{{ value }}{{ unit }}`.                                           |
| --tooltip-transform   | Tooltip location transform function, defaults to `translate(var(--thumb-offset), -35px)`.              |
| --tooltip-display     | Tooltip display value, set to `none` to hide tooltip, defaults to `initial`.                           |

## Selector CSS Attributes

| Name            | Description                                  |
| --------------- | -------------------------------------------- |
| --color         | The hover and selected color of an option.   |
| --hover-opacity | Opacity to use when hovering over an option. |

## Actions

There are three traditional ways to trigger an action - tap, double tap, and hold. Buttons, selector options, and spinbox buttons support all three, and sliders only support tap actions. Defining a double tap action that is not `none` introduces a 200ms delay to single tap actions.

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/button_actions_options.png" alt="button_actions_options" width="600"/>

Each action also supports the `confirmation` field. More information on Home Assistant action confirmations can be found [here](https://www.home-assistant.io/dashboards/actions/#options-for-confirmation).

When setting the action for a slider or spinbox, you must use `value` within a template in the action data to use the feature value in action. For convenience, a codebox for the action will be displayed below the normal action options.

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/slider_action_options.png" alt="slider_action_options" width="600"/>

### Action Types

Actions follow the [Home Assistant actions](https://www.home-assistant.io/dashboards/actions/) syntax. Most Home Assistant actions are supported.

| Action         | Description                                                                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Call service   | Call any Home Assistant service.                                                                                                                                                                                                        |
| Navigate       | Navigate to another Home Assistant page.                                                                                                                                                                                                |
| URL            | Navigate to an external URL.                                                                                                                                                                                                            |
| Assist         | Open the assist dialog. Uses the mobile dialog if available, like in the Home Assistant app. The pipeline ID and start listening options only work in the mobile assist dialog.                                                         |
| More info      | Open the more info dialog.                                                                                                                                                                                                              |
| Fire DOM event | Fire a browser dom event using the action object as the event detail. Useful for opening [browser mod popup cards](https://github.com/thomasloven/hass-browser_mod?tab=readme-ov-file#how-do-i-update-a-popup-from-the-browser-mod-15). |
| Repeat         | Repeat the tap action ten times a second while held. Only applicable to hold.                                                                                                                                                           |
| No action      | Explicilty set a command to do nothing.                                                                                                                                                                                                 |

### Adjustable Timings

Double tap and hold actions have user adjustable timings to change how they are triggered.

#### Hold Time

Hold actions are triggered by holding down on a button for a defined amount of time and then releasing. The default amount of time is 500ms. You can change this by setting `Hold Time` in the hold action to a different number.

#### Repeat and Repeat Delay

By setting a hold action to `repeat`, the tap action will repeat while the button is held down. The default delay between repeats is 100ms. You can change this by setting `Repeat Delay` in the hold action to a different number. See the below section on [repeat](#repeat) for more.

#### Double Tap Window

Double tap actions have a default window of 200ms to trigger before a single tap action is triggered instead. You can change this by setting `Double Tap Window` in the double tap action to a different number.

**NOTE**: Setting `Double Tap Window` above or too close to `Hold Time` can result in undesirable behavior, as the hold timer expires before the double tap window does.

### Momentary Button mode

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/momentary_actions_options.png" alt="momentary_actions_options" width="600"/>

As an alternative to normal tap, hold, and double tap actions, buttons, including those within selectors and spinboxes, can also be used in a momentary mode. Configuring this option disables the normal tap, hold, and double tap actions.

The momentary start action is fired when you first press down on a button. The momentary end action is fired when you release the button or touchpad. While these are meant to be used together you can use one or the other.

You can include the number of seconds a button has been held down using `hold_secs` in a template. For convenience, the momentary end action YAML is included in a code box below the action, like shown above.

# YAML Examples

While all configuration can now be done through the user interface, these YAML examples can provide some insight on how to do some advanced styling and templating.

## Example 1

A lock tile with lock and unlock selector options

```yaml
features:
  - type: custom:service-call
    entries:
      - type: selector
        entity_id: lock.front_door_ble
        options:
          - icon: mdi:lock
            option: locked
            tap_action:
              action: call-service
              service: lock.lock
              target:
                entity_id: lock.front_door_ble
              data: {}
            entity_id: lock.front_door_ble
            type: button
            value_attribute: state
            styles: |
              --color: var(--green-color);
          - icon: mdi:lock-open-outline
            option: unlocked
            tap_action:
              action: call-service
              service: lock.unlock
              target:
                entity_id: lock.front_door_ble
              data: {}
            autofill_entity_id: true
            haptics: false
            entity_id: lock.front_door_ble
            type: button
            value_attribute: state
            styles: |
              --color: var(--red-color);
        value_attribute: state
        styles: ''
type: tile
entity: lock.front_door_ble
show_entity_picture: false
vertical: false
layout_options:
  grid_columns: 4
  grid_rows: ''
card_mod:
  style:
    ha-tile-info$: |
      .secondary:after {
        visibility: visible;
        content: " ⸱ {{ states('sensor.front_door_battery_level') }}%";
      }
```

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/lock_tile.png" alt="lock_tile" width="600"/>

## Example 2

A light tile with a button for each bulb, a color selector, brightness and temperature sliders, and a brightness spinbox with emphasis on certain options.

```yaml
features:
  - type: custom:service-call
    entries:
      - type: button
        tap_action:
          action: call-service
          service: light.toggle
          confirmation:
            text: >-
              Are you sure you want to turn the light {{ 'on' if
              is_state('light.chandelier', 'off') else 'off' }}?
            exemptions: []
          target:
            entity_id: light.chandelier
        icon: >-
          {{ iif(is_state("light.chandelier", "on"), "mdi:ceiling-light",
          "mdi:ceiling-light-outline") }}
        label: '{{ value if value > 0 else "" }}{{ unit if value > 0 else "" }}'
        value_attribute: brightness
        unit_of_measurement: '%'
        autofill_entity_id: true
        entity_id: light.chandelier
        styles: |-
          :host {
            flex-basis: 200%;
            --icon-color: red;
            {% if is_state("light.chandelier", "on") %}
            --color: rgb({{ state_attr("light.chandelier", "rgb_color") }});
            {% endif %}
            ;
          }
      - tap_action:
          action: call-service
          service: light.toggle
          target:
            entity_id: light.chandelier_bulb_1
        icon: mdi:lightbulb
        label: Bulb 1
        entity_id: light.chandelier
        type: button
        value_attribute: state
        styles: |-
          :host {
            --icon-color: orange;
          }
      - tap_action:
          action: call-service
          service: light.toggle
          target:
            entity_id: light.chandelier_bulb_2
        icon: mdi:lightbulb
        label: Bulb 2
        entity_id: light.chandelier
        type: button
        value_attribute: state
        styles: |-
          :host {
            --icon-color: yellow;
          }
      - tap_action:
          action: call-service
          service: light.toggle
          target:
            entity_id: light.chandelier_bulb_3
        icon: mdi:lightbulb
        label: Bulb 3
        entity_id: light.chandelier
        type: button
        value_attribute: state
        styles: |-
          :host {
            --icon-color: green;
          }
      - tap_action:
          action: call-service
          service: light.toggle
          target:
            entity_id: light.chandelier_bulb_4
        icon: mdi:lightbulb
        label: Bulb 4
        entity_id: light.chandelier
        type: button
        value_attribute: state
        styles: |-
          :host {
            --icon-color: blue;
          }
      - tap_action:
          action: call-service
          service: light.toggle
          target:
            entity_id: light.chandelier_bulb_5
        icon: mdi:lightbulb
        label: Bulb 5
        entity_id: light.chandelier
        type: button
        value_attribute: state
        styles: |-
          :host {
            --icon-color: purple;
          }
    styles: ''
  - type: custom:service-call
    entries:
      - type: selector
        entity_id: light.chandelier
        value_attribute: rgb_color
        options:
          - tap_action:
              action: call-service
              service: light.turn_on
              data:
                color_name: red
              target:
                entity_id: light.chandelier
            option: 255,0,0
            label: Red
            icon: mdi:alpha-r
            entity_id: light.chandelier
            type: button
            value_attribute: state
            styles: |
              :host {
                --label-color: red;
                --color: red;
                {% if (state_attr("light.chandelier", "rgb_color") or []).join(',') == '255,0,0' %}
                --label-filter: invert(1);
                {% endif %}
              }
          - tap_action:
              action: call-service
              service: light.turn_on
              data:
                color_name: green
              target:
                entity_id: light.chandelier
            option: 0,128,0
            label: Green
            icon: mdi:alpha-g
            entity_id: light.chandelier
            type: button
            value_attribute: state
            styles: |-
              :host {
                --label-color: green;
                --color: green;
                {% if (state_attr("light.chandelier", "rgb_color") or []).join(',') == '0,128,0' %}
                --label-filter: invert(1);
                {% endif %}
              }
          - tap_action:
              action: call-service
              service: light.turn_on
              data:
                color_name: blue
              target:
                entity_id: light.chandelier
            option: 0,0,255
            label: Blue
            icon: mdi:alpha-b
            entity_id: light.chandelier
            type: button
            value_attribute: state
            styles: |-
              :host {
                --label-color: blue;
                --color: blue;
                {% if (state_attr("light.chandelier", "rgb_color") or []).join(',') == '0,0,255' %}
                --label-filter: invert(1);
                {% endif %}
              }
          - tap_action:
              action: call-service
              service: light.turn_on
              data:
                color_temp: 500
              target:
                entity_id: light.chandelier
            option: 255,166,87
            label: White
            icon: mdi:alpha-w
            entity_id: light.chandelier
            type: button
            value_attribute: state
            styles: |-
              :host {
                flex-basis: 200%;
                --label-color: white;
                --color: white;
                {% if (state_attr("light.chandelier", "rgb_color") or []).join(',') == '255,166,87' %}
                --label-filter: invert(1);
                --icon-filter: invert(1);
                {% endif %}
              }
          - tap_action:
              action: call-service
              service: light.turn_on
              target:
                entity_id: light.chandelier
              data:
                color_name: purple
            option: 128,0,128
            label: Purple
            icon: mdi:alpha-p
            entity_id: light.chandelier
            type: button
            value_attribute: state
            styles: |-
              :host {
                --label-color: purple;
                --color: purple;
                {% if (state_attr("light.chandelier", "rgb_color") or []).join(',') == '128,0,128' %}
                --label-filter: invert(1);
                {% endif %}
              }
        styles: |-
          .background {
            {% if is_state("light.chandelier", "on") %}
            --background: rgb({{ state_attr("light.chandelier", "rgb_color") }});
            {% endif %}
          }
  - type: custom:service-call
    entries:
      - type: slider
        label: '{{ value }}{{ unit }}'
        unit_of_measurement: '%'
        value_attribute: brightness
        icon: mdi:brightness-4
        tap_action:
          action: call-service
          service: light.turn_on
          data:
            brightness_pct: '{{ value }}'
          target:
            entity_id: light.chandelier
        entity_id: light.chandelier
        styles: |
          :host {
            flex-basis: 200%;
          }
        range:
          - 0
          - 100
        step: 1
      - type: slider
        thumb: line
        value_attribute: color_temp
        tap_action:
          action: call-service
          service: light.turn_on
          target:
            entity_id: light.chandelier
          data:
            color_temp: '{{ value }}'
        label: '{{ value }}{{ unit }}'
        unit_of_measurement: ' Mireds'
        icon: mdi:thermometer
        range:
          - '{{ state_attr("light.chandelier", "min_mireds") }}'
          - '{{ state_attr("light.chandelier", "max_mireds") }}'
        step: 1
        entity_id: light.chandelier
        styles: |-
          :host {
            --label-color: var(--disabled-color);
            --background: linear-gradient(-90deg, rgb(255, 167, 87), rgb(255, 255, 251));
            --background-opacity: 1;
          }
    styles: ''
  - type: custom:service-call
    entries:
      - type: spinbox
        haptics: true
        icon: mdi:brightness-4
        unit_of_measurement: '%'
        label: '{{ value }}{{ unit }}'
        step: 5
        debounceTime: 1000
        range:
          - 0
          - 100
        value_attribute: brightness
        tap_action:
          action: call-service
          service: light.turn_on
          data:
            brightness_pct: '{{ value | float }}'
          target:
            entity_id: light.chandelier
        decrement:
          icon: mdi:brightness-3
          label: down
          hold_action:
            action: repeat
          entity_id: light.chandelier
          type: button
          value_attribute: state
          styles: |-
            :host {
              flex-flow: row;
            }
            .icon {
              padding-right: 4px;
            }
        increment:
          icon: mdi:brightness-2
          label: up
          hold_action:
            action: repeat
          entity_id: light.chandelier
          type: button
          value_attribute: state
          styles: |-
            :host {
              flex-flow: row-reverse;
            }
            .icon {
              padding-left: 4px;
            }
        hold_action:
          action: repeat
        entity_id: light.chandelier
        styles: |-
          :host {
            --light-color: rgb({{ state_attr("light.chandelier", "rgb_color") }});
            --on-color: {{ "var(--light-color)" if is_state("light.chandelier", "on") else "initial" }};
            --background: var(--on-color);
            --icon-color: var(--on-color);
            --label-color: var(--on-color);
          }
type: tile
entity: light.chandelier
layout_options:
  grid_columns: 4
  grid_rows: auto
```

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/example_tile.png" alt="light_tile" width="600"/>

## Example 3

Multiple sliders for a room's light and curtains.

```yaml
features:
  - type: custom:service-call
    entries:
      - type: button
        haptics: true
        tap_action:
          action: call-service
          service: light.turn_on
          data:
            entity_id: light.sunroom_ceiling
            color_name: red
        double_tap_action:
          action: call-service
          service: light.turn_on
          xdouble_tap_window: 1000
          data:
            entity_id: light.sunroom_ceiling
            color_name: green
        hold_action:
          action: call-service
          service: light.turn_on
          xhold_time: 2000
          data:
            entity_id: light.sunroom_ceiling
            color_name: blue
        icon: mdi:power
        label: '{{ states("light.sunroom_ceiling") }}'
        entity_id: light.sunroom_ceiling
        value_attribute: state
        styles: |-
          :host {
            {% if is_state("light.sunroom_ceiling", "on") %}
            --color: rgb({{ state_attr("light.sunroom_ceiling", "rgb_color") }});
            {% endif %};
          }
      - type: slider
        haptics: true
        label: '{{ value }}{{ unit }}'
        unit_of_measurement: '%'
        value_attribute: brightness
        icon: mdi:brightness-4
        tap_action:
          action: call-service
          service: light.turn_on
          data:
            brightness_pct: '{{ value | int }}'
          target:
            entity_id: light.sunroom_ceiling
        entity_id: light.sunroom_ceiling
        range:
          - 0
          - 100
        step: 1
        thumb: default
        styles: |
          :host {
            flex-basis: 200%;
            {% if is_state("light.sunroom_ceiling", "on") %}
            --color: rgb({{ state_attr("light.sunroom_ceiling", "rgb_color") }})
            {% endif %}
          }
          .tooltip {
            {% if is_state("light.sunroom_ceiling", "off") %}
            display: none;
            {% endif %}
          }
  - type: custom:service-call
    entries:
      - type: slider
        thumb: line
        range:
          - 0
          - 360
        step: 0.1
        value_attribute: Hs color[0]
        icon: mdi:palette
        tap_action:
          action: call-service
          target:
            entity_id: light.sunroom_ceiling
          data:
            hs_color:
              - '{{ value }}'
              - 100
          service: light.turn_on
        entity_id: light.sunroom_ceiling
        styles: |-
          :host {
            flex-basis: 200%;
            --background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 66%, #f0f 83%, #f00 100%);
            --background-opacity: 1;
          }
          .tooltip {
            background: hsl({{ value }}, 100%, 50%);
          }
      - type: slider
        thumb: line
        value_attribute: color_temp
        tap_action:
          action: call-service
          service: light.turn_on
          data:
            color_temp: '{{ value }}'
            entity_id: light.sunroom_ceiling
        label: '{{ value }}{{ unit }}'
        unit_of_measurement: ' Mireds'
        icon: mdi:thermometer
        range:
          - '{{ state_attr("light.sunroom_ceiling", "min_mireds") }}'
          - '{{ state_attr("light.sunroom_ceiling", "max_mireds") }}'
        step: 1
        styles: |-
          :host {
            --background: linear-gradient(-90deg, rgb(255, 167, 87), rgb(255, 255, 251)); --background-opacity: 1; --label-color: var(--disabled-color);
          }
        autofill_entity_id: true
        entity_id: light.sunroom_ceiling
  - type: custom:service-call
    entries:
      - type: slider
        tap_action:
          action: call-service
          service: cover.set_cover_position
          data:
            position: '{{ value }}'
            entity_id: cover.sunroom_curtains
        value_attribute: current_position
        icon: mdi:curtains
        entity_id: cover.sunroom_curtains
        styles: |-
          :host {
            --color: var(--tile-color);
            --icon-color: var(--disabled-color);
          }
        range:
          - 0
          - 100
        step: 1
  - type: custom:service-call
    entries:
      - type: slider
        entity_id: media_player.spotify
        tap_action:
          action: call-service
          service: media_player.volume_set
          data:
            volume_level: '{{ value }}'
          target:
            entity_id: media_player.spotify
        value_attribute: volume_level
        icon: mdi:spotify
        label: |
          {{ state_attr(config.entity, "media_title") }}
          {{ state_attr(config.entity, "media_artist") }}
        range:
          - 0
          - 1
        thumb: round
        styles: |-
          :host {
            --color: rgb(31, 223, 100);
            flex-direction: row;
            border-radius: 40px;
            --tooltip-label: '{{ (value * 100) | int }}%';
            flex-basis: 500%;
          }
          .icon {
            color: rgb(37, 79, 55);
            padding: 8px;
            flex: auto;
            position: absolute;
            transform: translateX(var(--thumb-offset));
          }
          .label {
            left: -16px;
          }
        step: 0.01
      - type: button
        entity_id: media_player.spotify
        icon: mdi:play-pause
        tap_action:
          action: call-service
          service: media_player.media_play_pause
          data: {}
          target:
            entity_id: media_player.spotify
        double_tap_action:
          action: call-service
          service: script.spotify_refresh_every_5_seconds_for_30_seconds
          target:
            entity_id: media_player.spotify
        value_attribute: state
        styles: ''
  - type: custom:service-call
    entries:
      - type: button
        entity_id: media_player.spotify
        value_attribute: media_position
        tap_action:
          action: call-service
          service: media_player.media_previous_track
          target:
            entity_id: media_player.spotify
        label: >-
          {% set minutes = (value / 60) | int %} {% set seconds = (value - 60 *
          minutes) | int %} {{ minutes }}:{{ 0 if seconds < 10 else "" }}{{
          seconds | int }}
        styles: |-
          :host {
            overflow: visible;
            height: 12px;
            border-radius: 0px;
            --color: none;
          }
      - type: slider
        tap_action:
          action: call-service
          service: media_player.media_seek
          data:
            seek_position: '{{ value }}'
          target:
            entity_id: media_player.spotify
        entity_id: media_player.spotify
        value_attribute: media_position
        value_from_hass_delay: 5000
        range:
          - 0
          - '{{ state_attr(config.entity, "media_duration") }}'
        step: 1
        thumb: flat
        styles: |-
          :host {
            --color: rgb(31, 223, 100);
            --tooltip-label: '{{ (value / 60) | int }}:{{ 0 if (value - 60*((value / 60) | int)) < 10 else "" }}{{ (value - 60*((value / 60) | int)) | int }}';
            flex-basis: 1200%;
            height: 10px;
          }
      - type: button
        entity_id: media_player.spotify
        value_attribute: media_position
        tap_action:
          action: call-service
          service: media_player.media_next_track
          target:
            entity_id: media_player.spotify
        label: >-
          {{ (state_attr(config.entity, "media_duration") / 60) | int }}:{{ 0 if
          (state_attr(config.entity, "media_duration") -
          60*((state_attr(config.entity, "media_duration") / 60) | int)) < 10
          else "" }}{{ (state_attr(config.entity, "media_duration") -
          60*((state_attr(config.entity, "media_duration") / 60) | int)) | int
          }}
        styles: |-
          :host {
            overflow: visible;
            height: 12px;
            border-radius: 0px;
            --color: none;
          }
type: tile
entity: binary_sensor.sun_room
color: accent
icon: ''
layout_options:
  grid_columns: 4
  grid_rows: auto
```

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/slider_tile.png" alt="slider_tile" width="600"/>

## Example 4

Selectors for input selects. Note that the opacity of selector buttons is set to 0 by default, so they are completely transparent against the selector background.

```yaml
features:
  - type: custom:service-call
    entries:
      - type: selector
        entity_id: input_select.lounge_tv_theater_mode
        options:
          - icon: mdi:movie
            entity_id: input_select.lounge_tv_theater_mode
            option: Theater
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Theater
              target:
                entity_id: input_select.lounge_tv_theater_mode
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:movie-off
            entity_id: input_select.lounge_tv_theater_mode
            option: Light
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Light
              target:
                entity_id: input_select.lounge_tv_theater_mode
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:movie-outline
            entity_id: input_select.lounge_tv_theater_mode
            option: Dark
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Dark
              target:
                entity_id: input_select.lounge_tv_theater_mode
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:movie-off-outline
            entity_id: input_select.lounge_tv_theater_mode
            option: 'Off'
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: 'Off'
              target:
                entity_id: input_select.lounge_tv_theater_mode
            type: button
            value_attribute: state
            styles: ''
        value_attribute: state
        styles: |-
          :host {
            --color: var(--blue-color);
            flex-basis: 140%;
          }
      - type: selector
        entity_id: input_select.lounge_tv_listening_mode
        options:
          - icon: mdi:dolby
            entity_id: input_select.lounge_tv_listening_mode
            option: Movie
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Movie
              target:
                entity_id: input_select.lounge_tv_listening_mode
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:music
            entity_id: input_select.lounge_tv_listening_mode
            option: Music
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Music
              target:
                entity_id: input_select.lounge_tv_listening_mode
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:microsoft-xbox-controller
            entity_id: input_select.lounge_tv_listening_mode
            option: Game
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Game
              target:
                entity_id: input_select.lounge_tv_listening_mode
            type: button
            value_attribute: state
            styles: ''
        value_attribute: state
        styles: ''
  - type: custom:service-call
    entries:
      - type: selector
        entity_id: input_select.lounge_tv_source
        options:
          - icon: mdi:television-box
            entity_id: input_select.lounge_tv_source
            option: Google TV
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Google TV
              target:
                entity_id: input_select.lounge_tv_source
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:microsoft-windows
            entity_id: input_select.lounge_tv_source
            option: HTPC
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: HTPC
              target:
                entity_id: input_select.lounge_tv_source
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:vhs
            entity_id: input_select.lounge_tv_source
            option: DVD/VHS
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: DVD/VHS
              target:
                entity_id: input_select.lounge_tv_source
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:record-player
            entity_id: input_select.lounge_tv_source
            option: Vinyl
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: Vinyl
              target:
                entity_id: input_select.lounge_tv_source
            type: button
            value_attribute: state
            styles: ''
          - icon: mdi:video-input-hdmi
            entity_id: input_select.lounge_tv_source
            option: External
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: External
              target:
                entity_id: input_select.lounge_tv_source
            type: button
            value_attribute: state
            styles: ''
        value_attribute: state
        styles: |-
          :host {
            --color: var(--red-color);
          }
type: tile
entity: input_select.lounge_tv_listening_mode
color: green
layout_options:
  grid_columns: 4
  grid_rows: auto
```

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/selector_tile.png" alt="selector_tile" width="600"/>

## Example 5

Using a selector to display different features.

```yaml
features:
  - type: custom:service-call
    entries:
      - type: selector
        options:
          - option: A
            icon: mdi:alpha-{{ config.option | lower }}
            styles: |-
              :host {
                --icon-color: {{ "var(--disabled-color)" if is_state(config.entity, config.option) }};
                --color: var(--red-color);
              }
            entity_id: input_select.select_test
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: A
              target:
                entity_id: input_select.select_test
            type: button
            value_attribute: state
          - option: B
            icon: mdi:alpha-{{ config.option | lower }}
            entity_id: input_select.select_test
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: B
              target:
                entity_id: input_select.select_test
            type: button
            value_attribute: state
            styles: |-
              :host {
                --icon-color: {{ "var(--disabled-color)" if is_state(config.entity, config.option) }};
                --color: var(--green-color);
              }
          - option: C
            icon: mdi:alpha-{{ config.option | lower }}
            entity_id: input_select.select_test
            tap_action:
              action: call-service
              service: input_select.select_option
              data:
                option: C
              target:
                entity_id: input_select.select_test
            type: button
            value_attribute: state
            styles: |-
              :host {
                --icon-color: {{ "var(--disabled-color)" if is_state(config.entity, config.option) }};
                --color: var(--blue-color);
              }
        entity_id: input_select.select_test
        value_attribute: state
        styles: ''
  - type: custom:service-call
    entries:
      - type: button
        icon: mdi:arrow-down-bold
        tap_action:
          action: call-service
          service: input_number.decrement
          data:
            entity_id: input_number.slider_test
        hold_action:
          action: repeat
          repeat_delay: 10
        entity_id: input_number.slider_test
        value_attribute: state
        styles: ''
      - type: slider
        thumb: round
        entity_id: input_number.slider_test
        label: |
          Input Number
          {{ value }}{{ unit }}
        unit_of_measurement: '#'
        icon: mdi:numeric
        styles: |-
          :host {
            flex-basis: 600%;
            --tooltip-label: "The number is {{ value }}";
            border-radius: 40px;
            --label-color: var(--disabled-color);
          }
          .icon {
            color: var(--accent-color);
            padding: 8px;
            flex: auto;
            position: absolute;
            transform: translateX(var(--thumb-offset));
            --mdc-icon-size: 24px;
          }
        range:
          - -128
          - 128
        tap_action:
          action: call-service
          target:
            entity_id:
              - input_number.slider_test
          service: input_number.set_value
          data:
            value: '{{ value | int }}'
        autofill_entity_id: true
        step: 0.5
        value_attribute: state
      - type: button
        icon: mdi:arrow-up-bold
        action: call-service
        haptics: true
        hold_action:
          action: repeat
          repeat_delay: 10
        entity_id: input_number.slider_test
        tap_action:
          action: call-service
          service: input_number.increment
          target:
            entity_id:
              - input_number.slider_test
        value_attribute: state
        styles: ''
    styles: |-
      {% if not is_state(config.entity, "A")  %}
      :host {
        display: none;
      }
      {% endif %}
  - type: custom:service-call
    entries:
      - type: spinbox
        tap_action:
          action: call-service
          service: input_number.set_value
          data:
            value: '{{ value }}'
          target:
            entity_id: input_number.slider_test
        range:
          - -128
          - 128
        step: 0.5
        label: '{{ value }}'
        hold_action:
          action: repeat
          repeat_delay: 50
        autofill_entity_id: true
        decrement:
          entity_id: input_number.slider_test
          type: button
          value_attribute: state
          styles: ''
        entity_id: input_number.slider_test
        increment:
          entity_id: input_number.slider_test
          type: button
          value_attribute: state
          styles: ''
        value_attribute: state
        styles: ''
    styles: |
      {% if not is_state(config.entity, "A")  %}
      :host {
        display: none;
      }
      {% endif %}
  - type: custom:service-call
    entries:
      - type: button
        icon: mdi:youtube
        tap_action:
          action: url
          url_path: youtube.com
        double_tap_action:
          action: url
          url_path: play.spotify.com
        entity_id: input_select.select_test
        value_attribute: state
        styles: ''
      - type: button
        icon: mdi:view-dashboard
        tap_action:
          action: navigate
          navigation_path: /lovelace/0
        double_tap_action:
          action: navigate
          navigation_path: /lovelace-extra/0
        entity_id: input_select.select_test
        value_attribute: state
        styles: ''
      - type: button
        icon: mdi:view-compact
        tap_action:
          action: navigate
          navigation_path: /lovelace-extra/subview
        entity_id: input_select.select_test
        value_attribute: state
        styles: ''
    styles: |-
      {% if not is_state(config.entity, "B")  %}
      :host {
        display: none;
      }
      {% endif %}
  - type: custom:service-call
    entries:
      - type: button
        icon: mdi:assistant
        tap_action:
          action: assist
          pipeline_id: last_used
        label: ''
        entity_id: input_select.select_test
        value_attribute: state
        styles: ''
        double_tap_action:
          action: navigate
          navigation_path: '?conversation=1'
      - type: button
        tap_action:
          action: more-info
          target:
            entity_id: sensor.fordpass_elveh
        entity_id: sensor.fordpass_elveh
        value_attribute: state
        styles: |-
          :host {
            background-image: url('http://homeassistant.local:8123/local/ford_mme.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 1;
          }
    styles: |-

      {% if not is_state(config.entity, "C")  %}
      :host {
        display: none;
      }
      {% endif %}
type: tile
entity: input_select.select_test
show_entity_picture: false
vertical: false
color: primary
layout_options:
  grid_columns: 4
  grid_rows: auto
```

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/selector_show_tile.png" alt="selector_show_tile" width="1200"/>

## Example 6

A better looking temperature spinbox with hold on repeat, tile color, and an icon and label. Also an XKCD button that opens a different comic based on how long you hold it using momentary button mode.

```yaml
features:
  - type: custom:service-call
    entries:
      - type: spinbox
        icon: mdi:thermometer
        label: '{{ value }}{{ unit }}'
        step: 1
        debounceTime: 1000
        range:
          - '{{ state_attr("climate.downstairs_thermostat", "min_temp") }}'
          - '{{ state_attr("climate.downstairs_thermostat", "max_temp") }}'
        value_attribute: temperature
        unit_of_measurement: °F
        hold_action:
          action: repeat
        entity_id: climate.downstairs_thermostat
        styles: |-
          :host {
            --background: var(--tile-color);
            --icon-color: var(--tile-color);
            flex-flow: row;
          }
        tap_action:
          action: call-service
          service: climate.set_temperature
          target:
            entity_id: climate.downstairs_thermostat
          data:
            temperature: '{{ value }}'
  - type: custom:service-call
    entries:
      - type: button
        label: XKCD
        value_from_hass_delay: 5000
        momentary_end_action:
          action: url
          url_path: https://xkcd.com/{{ 1000* HOLD_SECS }}
        entity_id: climate.downstairs_thermostat
        value_attribute: state
  - type: custom:service-call
    entries:
      - type: button
        entity_id: sensor.cold_flu_index_today
        label: |-
          State Float
          {{ value }}
        value_attribute: state
        styles: ''
      - type: button
        entity_id: sensor.cold_flu_index_today
        label: |-
          State Float
          {{ value }}
        value_attribute: strep_index
        icon: ''
        styles: |-
          .background {
            --color: {{ "blue" if state_attr(config.entity, config.attribute) < 3 else "green" }};
          }
        tap_action:
          action: more-info
          target:
            entity_id: sensor.cold_flu_index_today
          confirmation:
            exemptions:
              - user: 7e9bf9d73edc48df8ece5cec7e9a4f00
              - user: af773a442cd7493f8178f7c23b7882d7
            text: Display Cold & Flue Index?
type: tile
entity: climate.downstairs_thermostat
layout_options:
  grid_columns: 4
  grid_rows: auto
```

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/spinbox_tile.png" alt="spinbox_tile" width="600"/>

## Example 7

A read only timer display with buttons and multiple labels.

```yaml
features:
  - type: custom:service-call
    entries:
      - type: button
        value_attribute: elapsed
        label: >-
          {% set minutes = (value / 60) | int %} {% set seconds = (value - 60 *
          minutes) | int %} {{ minutes }}:{{ 0 if seconds < 10 else "" }}{{
          seconds | int }}
        styles: |-
          :host {
            overflow: visible;
            height: 12px;
            border-radius: 0px;
            --color: none;
          }
        entity_id: timer.timer_test
      - type: slider
        tap_action:
          action: none
        value_attribute: elapsed
        thumb: flat
        step: 1
        range:
          - 0
          - >-
            {% set hms = state_attr(config.entity, "duration").split(":") %} {{
            (hms[0] |int ) * 3600 + (hms[1] | int) * 60 + (hms[2] | int) }}
        styles: |-
          :host {
            flex-basis: 1200%;
            height: 10px;
            --thumb-width: 1px;
          }
        entity_id: timer.timer_test
      - type: button
        value_attribute: duration
        label: '{% set hms = value.split(":") %} {{ hms[1] | int }}:{{ hms[2] }}'
        styles: |-
          :host {
            overflow: visible;
            height: 12px;
            border-radius: 0px;
            --color: none;
          }
        entity_id: timer.timer_test
  - type: custom:service-call
    entries:
      - type: button
        icon: mdi:timer-check
        tap_action:
          action: call-service
          service: timer.start
          target:
            entity_id: timer.timer_test
        entity_id: timer.timer_test
        value_attribute: elapsed
      - type: button
        icon: mdi:timer-pause
        tap_action:
          action: call-service
          service: timer.pause
          target:
            entity_id: timer.timer_test
        entity_id: timer.timer_test
        value_attribute: elapsed
      - type: button
        icon: mdi:timer-cancel
        tap_action:
          action: call-service
          service: timer.cancel
          target:
            entity_id: timer.timer_test
        entity_id: timer.timer_test
        value_attribute: elapsed
    styles: |-
      :host {
        --mdc-icon-size: 32px;
      }
type: tile
entity: timer.timer_test
layout_options:
  grid_columns: 4
  grid_rows: auto
```

<img src="https://raw.githubusercontent.com/Nerwyn/service-call-tile-feature/main/assets/timer_tile.png" alt="timer_tile" width="600"/>

[last-commit-shield]: https://img.shields.io/github/last-commit/Nerwyn/service-call-tile-feature?style=for-the-badge
[commits]: https://github.com/Nerwyn/service-call-tile-feature/commits/main
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/t/service-call-button-tile-feature/620724
[license-shield]: https://img.shields.io/github/license/Nerwyn/service-call-tile-feature.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/badge/maintainer-Nerwyn-blue.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/Nerwyn/service-call-tile-feature.svg?style=for-the-badge
[releases]: https://github.com/nerwyn/service-call-tile-feature/releases
[github]: https://img.shields.io/github/followers/Nerwyn.svg?style=social
