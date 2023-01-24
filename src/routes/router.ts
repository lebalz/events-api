import express from 'express';
import { create as createEvent, events, find, update, importEvents } from '../controllers/event';
import { sync, teachers } from '../controllers/untis';
import { user, users, linkToUntis, find as findUser } from '../controllers/user';
import multer from 'multer';

// initialize router
const router = express.Router();

router.get('/user', user);
router.get('/user/all', users);
router.get('/user/:id', findUser);
router.put('/user/:id/link_to_untis', linkToUntis);


router.get('/event/all', events);
const upload = multer({ dest: 'uploads/' })
router.post('/event/import', upload.single('terminplan'), importEvents);
router.get('/event/:id', find);
router.put('/event/:id', update);
router.post('/event', createEvent);

router.get('/untis/teachers', teachers);
router.post('/untis/sync', sync);

export default router;