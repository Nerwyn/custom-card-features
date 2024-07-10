const path = require('path');
const { execSync } = require('child_process');

let env =
	execSync('git branch --show-current').toString().trim() == 'main'
		? 'production'
		: 'development';
env = 'production';

module.exports = {
	mode: env,
	stats: {
		warnings: false,
	},
	entry: {
		'service-call-tile-feature': './src/service-call-tile-feature.ts',
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: '[name].min.js',
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.css?$/,
				loader: 'lit-css-loader',
				options: {
					cssnano: true,
				},
			},
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
			},
			{
				test: /\.(jsx?|tsx?)$/,
				loader: 'minify-html-literals-loader',
			},
		],
	},
	devtool: env == 'production' ? false : 'eval',
};
