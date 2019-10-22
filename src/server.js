require('dotenv').config();

const express = require('express');
// built in modeul in Node, which allows us to link directories and 
// file paths
const path = require('path');
// processes incoming request bodies
const bodyParser = require('body-parser');
// to check if url is valid
const dns = require('dns');
// mongodb is the native drive for interacting with a MongoDB instance
const { MongoClient } = require('mongodb');
const nanoid = require('nanoid')

const databaseURL = process.env.DATABASE;

const app = express();
// express has built-in middleware function "static" that shows where
// images, css, and js files are (can specify multiple)
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

MongoClient.connect(databaseURL, { useNewUrlParser: true })
	.then(client => {
		// storing the reference to the client db in express object locals.db
		app.locals.db = client.db('shortener');
	})
	.catch(console.error('Failed to connect to the database'));

const shortenURL = (db, url) => {
	// pulls the collection, or creates one if one does not exist already
	const shortenedURLS = db.collection('shortenedURLS');
	// findOneAndUpdate method allows us to update or delete entry
	return shortenedURLS.findOneAndUpdate(
		// used to filter the collection
		{ original_url: url }, 
		// update operators
		{
			// sets the value of the Document only if it is being inserted
			$setOnInsert: {
				original_url: url,
				// unique 7 characters
				short_id: nanoid(7)	
			},

		},
		{
			// only returns new documents
			returnOriginal: false,
			// ensures that doc is created if it doesn't exist
			upsert: true,
		}
	);
}

// returns a document that matches the filter object passed to it or null
// if no documents match the filter
const checkIfShortIdExists = (db, code) => db.collection('shortenedURLS')
	.findOne({ short_id: code });

app.get('/', (req, res) => {
	const htmlPath = path.join(__dirname, 'public', 'index.html');
	// sendFile takes directory path plus specific path given, in which the executing file is located
	res.sendFile(htmlPath);
});

app.post('/new', (req, res) => {
	let originalURL;
	try {
		originalURL = new URL(req.body.url);
		console.log(req.body.url);
	} catch(err) {
		return res.status(400).send({ error: 'invalid URL' });
	}

	// dns lookup of original url
	dns.lookup(originalURL.hostname, (err) => {
		if (err) {
			return res.status(404).send({ error: 'Address not found' });
		}
		// pull of the database from the saved version 
		const { db } = req.app.locals;
		// shorten it
		shortenURL(db, originalURL.href)
		// return result
		.then(result => {
			const doc = result.value;
			res.json({
				original_url: doc.original_url,	
				short_id: doc.short_id,
			});
		})
		// catch the error and put it on the console
		.catch(console.error);
	});
});

// redirect them to the orginal URLs
app.get('/:short_id', (req, res) => {
	const shortId = req.params.short_id;
	const { db } = req.app.locals;
	checkIfShortIdExists(db, shortId)
		.then(doc => {
			if (doc === null) return res.send('could not find a link at that URL');
			res.redirect(doc.original_url);
		})
		.catch(console.error);
});

app.set('port', process.env.PORT || 3000);

const server = app.listen(app.get('port'), () => {
	console.log(`Express running -> PORT ${server.address().port}`);
});
