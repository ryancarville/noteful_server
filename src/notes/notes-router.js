const path = require('path');
const express = require('express');
const xss = require('xss');
const NotesService = require('./notes-service');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
	id: note.id,
	note_name: xss(note.note_name),
	date_mod: note.date_mod,
	folder_id: note.folder_id,
	content: xss(note.content)
});

notesRouter
	.route('/')
	.get((req, res, next) => {
		const knexInstance = req.app.get('db');
		NotesService.getAllNotes(knexInstance)
			.then(notes => {
				res.json(notes.map(serializeNote));
			})
			.catch(next);
	})
	.post(jsonParser, (req, res, next) => {
		const { note_name, date_mod, folder_id, content } = req.body;
		const newNote = { note_name, date_mod, folder_id, content };

		for (const [key, value] of Object.entries(newNote))
			if (value == null)
				return res
					.status(400)
					.json({ error: { message: `Missing '${key}' in request body'` } });
		NotesService.insertNotes(req.app.get('db'), newNote)
			.then(note => {
				return res
					.status(204)
					.location(path.posix.join(req.originalUrl + `/${note.id}`))
					.json(serializeNote(note));
			})
			.catch(next);
	});

notesRouter
	.route('/:note_id')
	.all((req, res, next) => {
		NotesService.getById(req.app.get('db'), req.params.note_id)
			.then(note => {
				if (!note) {
					res.status(404).json({ error: { message: `Note doesn't exist` } });
				}
				res.note = note;
				next();
			})
			.catch(next);
	})
	.get((req, res, next) => {
		res.json(serializeNote(note));
	})
	.delete((req, res, next) => {
		NotesService.deleteNote(req.app.get('db'), req.params.note_id)
			.then(numRowsAffected => {
				res.status(204).end();
			})
			.catch(next);
	})
	.patch(jsonParser, (req, res, next) => {
		const { note_name, date_mod, content } = req.body;
		const noteToUpdate = { note_name, date_mod, content };

		const numOfValues = Object.values(noteToUpdate).filter(Boolean).length;
		if (numOfValues === 0) {
			res.status(400).json({
				error: {
					message: `Request body must contain at 'note_name', 'date_mod', or 'content'`
				}
			});
		}
		NotesService.updateNote(req.app.get('db'), req.params.note_id, noteToUpdate)
			.then(numRowsAffected => {
				res.status(204).end();
			})
			.catch(next);
	});

module.exports = notesRouter;
