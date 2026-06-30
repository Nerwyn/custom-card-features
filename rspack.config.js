import { defineConfig } from '@rspack/cli';

export default defineConfig([
	{
		mode: 'production',
		entry: {
			'custom-features-row': './src/custom-features-row.ts',
		},
		output: {
			filename: '/custom-card-features.min.js',
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
		devtool: false,
	},
]);
