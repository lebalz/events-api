import express from 'express';
import { create as createEvent, events, find, update, importEvents, destroy } from '../controllers/event';
import {find as findJob, all as allJobs, destroy as deleteJob} from '../controllers/job';
import { all as allDepartments, find as findDepartment, update as updateDepartment, create as createDepartment, destroy as deleteDepartment } from '../controllers/department';
import { all as allRegistrationPeriods } from '../controllers/registrationPeriod';
import { all as allSemesters } from '../controllers/semester';
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
router.delete('/event/:id', destroy);
router.post('/event', createEvent);

const upload = multer({ dest: 'uploads/' })
router.post('/event/import', upload.single('terminplan'), importEvents);


router.get('/job/all', allJobs);
router.get('/job/:id', findJob);
router.delete('/job/:id', deleteJob);

router.get('/untis/teacher/all', teachers);
router.get('/untis/teacher/:id', teacher);
router.post('/untis/sync', sync);

router.get('/department/all', allDepartments);
router.get('/department/:id', findDepartment);
router.put('/department/:id', updateDepartment);
router.post('/department/:id', createDepartment);
router.delete('/department/:id', deleteDepartment);


router.get('/semester/all', allSemesters);
router.get('/registration_period/all', allRegistrationPeriods);


export default router;