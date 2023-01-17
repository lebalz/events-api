import express from 'express';
import { create as createEvent, events, find, update } from '../controllers/event';
import { get as getUntis } from '../controllers/untis';
import { user, users } from '../controllers/user';

// initialize router
const router = express.Router();

router.get('/user', user);
router.get('/user/all', users);


router.get('/event/all', events);
router.get('/event/:id', find);
router.put('/event/:id', update);
router.post('/event', createEvent);

router.get('/untis', getUntis);

export default router;