const path = require('path');
const express = require('express');
const xss = require('xss');
const FolderService = require('./folders-service');

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
	id: folder.id,
	folder_name: xss(folder.folder_name)
});

foldersRouter
	.route('/')
	.get((req, res, next) => {
		const knexInstance = req.app.get('db');
		FolderService.getAllFolders(knexInstance)
			.then(folders => {
				res.json(folders.map(serializeFolder));
			})
			.catch(next);
	})
	.post(jsonParser, (req, res, next) => {
		const { folder_name } = req.body;
		const newFolder = { folder_name };

		for (const [key, value] of Object.entries(newFolder))
			if (value == null)
				return res.status(400).json({
					error: { message: `Missing '${key}' in request body'` }
				});
		FolderService.insertFolder(req.app.get('db'), newFolder)
			.then(folder => {
				res
					.status(201)
					.location(path.posix.join(req.originalUrl + `/${folder.id}`))
					.json(serializeFolder(folder));
			})
			.catch(next);
	});

foldersRouter
	.route('/:folder_id')
	.all((req, res, next) => {
		FolderService.getById(req.app.get('db'), req.params.folder_id)
			.then(folder => {
				if (!folder) {
					res.status(404).json({
						error: { message: `Folder doesn't exist` }
					});
				}
				res.folder = folder;
				next();
			})
			.catch(next);
	})
	.get((req, res, next) => {
		res.json(serializeFolder(folder));
	})
	.delete((req, res, next) => {
		FolderService.deleteFolder(req.app.get('db'), req.params.folder_id)
			.then(numRowsAffected => {
				res.status(204).end();
			})
			.catch(next);
	})
	.patch(jsonParser, (req, res, next) => {
		const { folder_name } = req.body;
		const folderToUpdate = { folder_name };

		const numOfValues = Object.values(folderToUpdate).filter(Boolean).length;

		if (numOfValues === 0) {
			return res.status(400).json({
				error: { message: `Request body must contain 'folder_name'` }
			});
		}
		FolderService.updateFolder(
			req.app.get('db'),
			req.params.folder_id,
			folderToUpdate
		)
			.then(numRowsAffected => {
				res.status(204).end();
			})
			.catch(next);
	});
module.exports = foldersRouter;
