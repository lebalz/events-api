import express from 'express';
import { create as createEvent, all as allEvents, find as findEvent, update as updateEvent, importEvents, destroy as deleteEvent } from '../controllers/event';
import { find as findJob, all as allJobs, destroy as deleteJob, update as updateJob } from '../controllers/job';
import { all as allDepartments, find as findDepartment, update as updateDepartment, create as createDepartment, destroy as deleteDepartment } from '../controllers/department';
import { find as findRegistrationPeriod, all as allRegistrationPeriods, update as updateRegistrationPeriod, destroy as deleteRegistrationPeriod, create as createRegistrationPeriod } from '../controllers/registrationPeriod';
import { find as findSemester, update as updateSemester, all as allSemesters, create as createSemester, destroy as deleteSemester } from '../controllers/semester';
import { sync, teachers, teacher, classes } from '../controllers/untis';
import { user, all as allUsers, linkToUntis, find as findUser } from '../controllers/user';
import multer from 'multer';


// initialize router
const router = express.Router();

router.get('/user', user);
router.get('/user/all', allUsers);
router.get('/user/:id', findUser);
router.put('/user/:id/link_to_untis', linkToUntis);


router.get('/event/all', allEvents);
router.get('/event/:id', findEvent);
router.put('/event/:id', updateEvent);
router.delete('/event/:id', deleteEvent);
router.post('/event', createEvent);

const upload = multer({ dest: 'uploads/' })
router.post('/event/import', upload.single('terminplan'), importEvents);


router.get('/job/all', allJobs);
router.get('/job/:id', findJob);
router.put('/job/:id', updateJob);
router.delete('/job/:id', deleteJob);

router.get('/untis/teacher/all', teachers);
router.get('/untis/teacher/:id', teacher);
router.get('/untis/class/all', classes);
router.post('/untis/sync', sync);

router.get('/department/all', allDepartments);
router.get('/department/:id', findDepartment);
router.put('/department/:id', updateDepartment);
router.post('/department', createDepartment);
router.delete('/department/:id', deleteDepartment);


router.get('/semester/all', allSemesters);
router.get('/semester/:id', findSemester);
router.put('/semester/:id', updateSemester);
router.delete('/semester/:id', deleteSemester);
router.post('/semester', createSemester);

router.get('/registration_period/all', allRegistrationPeriods);
router.get('/registration_period/:id', findRegistrationPeriod);
router.put('/registration_period/:id', updateRegistrationPeriod);
router.delete('/registration_period/:id', deleteRegistrationPeriod);
router.post('/registration_period', createRegistrationPeriod);


export default router;