export function unescapeHtml(str: string): string {
	const htmlEntities: Record<string, string> = {
		'&quot;': '"',
		'&#34;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&#x27;': "'",
		'&lt;': '<',
		'&gt;': '>',
		'&amp;': '&',
	};

	return str.replace(
		/&quot;|&#34;|&#39;|&apos;|&#x27;|&lt;|&gt;|&amp;/g,
		(match) => htmlEntities[match],
	);
}
