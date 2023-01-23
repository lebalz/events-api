import express from 'express';
import { create as createEvent, events, find, update } from '../controllers/event';
import { sync, teachers } from '../controllers/untis';
import { user, users, linkToUntis, find as findUser } from '../controllers/user';

// initialize router
const router = express.Router();

router.get('/user', user);
router.put('/user/:id', findUser);
router.put('/user/:id/link_to_untis', linkToUntis);
router.get('/user/all', users);


router.get('/event/all', events);
router.get('/event/:id', find);
router.put('/event/:id', update);
router.post('/event', createEvent);

router.get('/untis/teachers', teachers);
router.post('/untis/sync', sync);

export default router;