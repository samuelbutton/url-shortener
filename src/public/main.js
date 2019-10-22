
const form = document.querySelector('.url-form');
const result = document.querySelector('.result-section');

form.addEventListener('submit', event => {
	// prevents form submission
	event.preventDefault();

	// find element with given url class name
	const input = document.querySelector('.url-input');
	
	// posting to /new and passing the context as the given object
	fetch('/new', {
		method: 'POST',
		// need to set headers for post
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		// want to consume the URL as JSON on the server
		body: JSON.stringify({
			url: input.value,
		})
	})
	// after we fetch we receive a response
	.then(response => {
		if(!response.ok) {
			throw Error(response.statusText);
		}
		return response.json();
	})

	.then(data => {
		while (result.hasChildNodes()) {
			result.removeChild(result.lastChild);
		}
		result.insertAdjacentHTML('afterbegin', `
			<div class="result">
				<a target="_blank" class="short-url" rel="noopener" href="/${data.short_id}">
					${location.origin}/${data.short_id}
				</a>
			</div>
		`)
	})
	.catch(console.error)
});