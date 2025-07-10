const path = require('path');
const { execSync } = require('child_process');

let env =
	execSync('git branch --show-current').toString().trim() == 'main'
		? 'production'
		: 'development';
env = 'production';

module.exports = {
	mode: env,
	entry: {
		'custom-features-row': './src/custom-features-row.ts',
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: 'custom-card-features.min.js',
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
			},
			{
				test: /\.(jsx?|tsx?)$/,
				loader: 'minify-html-literals-loader',
			},
			{
				test: /\.m?js/,
				resolve: {
					fullySpecified: false,
				},
			},
		],
	},
	performance: {
		hints: false,
		maxEntrypointSize: 512000,
		maxAssetSize: 512000,
	},
	devtool: env == 'production' ? false : 'eval',
};
