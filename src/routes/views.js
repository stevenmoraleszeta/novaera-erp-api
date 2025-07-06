const express = require('express');
const router = express.Router();
const viewsController = require('../controllers/viewsController');

router.get('/', viewsController.getViewsByTable);
router.post('/', viewsController.createView);
router.post('/columns', viewsController.addColumnToView);
router.get('/columns', viewsController.getColumnsByView);
router.delete('/:id', viewsController.deleteView);
router.put('/:id', viewsController.updateView);
router.put('/columns/:id', viewsController.updateViewColumn);
router.patch('/:id/update_views', viewsController.updateViewPosition);

module.exports = router;
