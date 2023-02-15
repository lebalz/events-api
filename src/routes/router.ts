import express from 'express';
import { create as createEvent, events, find, update, importEvents } from '../controllers/event';
import {find as findJob, all as allJobs, destroy as deleteJob} from '../controllers/job';
import { sync, teachers, teacher } from '../controllers/untis';
import { user, users, linkToUntis, find as findUser } from '../controllers/user';
import multer from 'multer';

// initialize router
const router = express.Router();

router.get('/user', user);
router.get('/user/all', users);
router.get('/user/:id', findUser);
router.put('/user/:id/link_to_untis', linkToUntis);


router.get('/event/all', events);
router.get('/event/:id', find);
router.put('/event/:id', update);
router.post('/event', createEvent);

const upload = multer({ dest: 'uploads/' })
router.post('/event/import', upload.single('terminplan'), importEvents);


router.get('/job/all', allJobs);
router.get('/job/:id', findJob);
router.delete('/job/:id', deleteJob);

router.get('/untis/teacher/all', teachers);
router.get('/untis/teacher/:id', teacher);
router.post('/untis/sync', sync);

export default router;