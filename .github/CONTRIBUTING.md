# Contributing

Want to help make this project better? I'm open to pull requests! You'll have to have some knowledge of TypeScript and git to contribute.

## Create a fork

First you'll need to fork this repository and then `git clone` that fork to your development machine. Navigate to the GitHub repository home page, click Fork, and follow the instructions there to create your own fork. Then use the `git clone` command to download the fork to your development machine.

If you have not used git or cloned a repository before, you may want to read through the [GitHub documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo).

## Setup your cloned repository for development

This project is written in TypeScript and compiled into a minified JavaScript file for distribution via the Home Assistant Community Store, and requires a little bit of setup on your machine first.

Run `npm run setup` to configure the pre-commit githook build pipeline and install dependencies. Don't worry about the three severe vulnerabilities, they're in the build pipeline and not present in the distributed JavaScript file. If there's more than that then `npm audit fix` may need to be run.

## Develop!

You're now ready to make your code changes. Do your best to follow the style and syntax of the existing code. Avoid changing any of the configuration files (eslint, prettier, tsconfig, webpack) if possible. Do not use `any` unless there's a good reason to do so, like a field that truly can be anything.

All actions that this card perform send commands to Home Assistant via service calls and do not interact with other devices directly. Interacting with devices on the network or external websites directly is anti-pattern and should be avoided, and changes that do so will be rejected.

## Building and testing

The pre-commit githook build pipeline you (should have) setup should compile the project into a minified JavaScript file whenever a commit is made. You can also run the build pipeline using the command `npm run build`.

In the `dist` folder, the `min.js` file is what is served via the Home Assistant Community Store. This file is gzipped on Home Assistant when installed via HACS, and that `min.js.gz` file is served to the Home Assistant frontend. To test your changes on your Home Assistant server, you must replace the `min.js.gz` (NOT the `min.js` file) and hard refresh you browser. If installed via HACS, your custom frontend modules should be located at `config/www/community`. Within that should be a folder for this project, and within that should be the `min.js` and `min.js.gz` files. Replace the `min.js.gz` file here with your updated copy and then hard refresh your browser. To hard refresh, either press `CTRL` + `F5`, or open browser developer tools (`F12` or `CTRL` + `I`), right click the refresh button, and then click `Empty Cache and Hard Reload`.

You should now be able to test that your changes work! Try to test your changes on multiple different browsers or devices. I've run into a lot of issues with different browsers and mobile webviews behaving differently, especially iOS/iPadOS webview.

## The editor and documentation

This project features a UI editor for all fields. Any new fields added to the frontend configuration must be accessible from this editor (barring templating certain fields). This includes creating new sub-editors for new features. The editor is admittedly a huge mess that, and I'm open to doing this work if needed.

Any new features should be documented in the README.

## Make a pull request

Once you think your code is ready, make a pull request on the original repository! Make sure to use [the included PR template](https://github.com/Nerwyn/service-call-tile-feature/blob/main/.github/PULL_REQUEST_TEMPLATE/pull_request.md).
