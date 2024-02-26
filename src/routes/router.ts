import express, { RequestHandler } from 'express';
import { create as createEvent, all as allEvents, find as findEvent, update as updateEvent, importEvents, clone as cloneEvent, destroy as deleteEvent, setState as setEventState, exportExcel } from '../controllers/event';
import { find as findJob, all as allJobs, destroy as deleteJob, update as updateJob } from '../controllers/job';
import { all as allDepartments, find as findDepartment, update as updateDepartment, create as createDepartment, destroy as deleteDepartment } from '../controllers/department';
import { find as findRegistrationPeriod, all as allRegistrationPeriods, update as updateRegistrationPeriod, destroy as deleteRegistrationPeriod, create as createRegistrationPeriod } from '../controllers/registrationPeriod';
import { find as findEventGroup, allOfUser as usersEventGroup, update as updateEventGroup, destroy as deleteEventGroup, create as createEventGroup, events as eventsFromEventGroup, clone as cloneEventGroup } from '../controllers/eventGroup';
import { find as findSemester, update as updateSemester, all as allSemesters, create as createSemester, destroy as deleteSemester, sync } from '../controllers/semester';
import { teachers, teacher, classes, subjects } from '../controllers/untis';
import { user, events as usersEvents, all as allUsers, linkToUntis, find as findUser, update as updateUser, createIcs, setRole, affectedEventIds } from '../controllers/user';
import multer from 'multer';

const UPLOAD_DIR = process.env.UPLOAD_DIR
    ? process.env.UPLOAD_DIR 
    : process.env.NODE_ENV === 'test' ? 'tests/test-data/uploads' : 'uploads';

// initialize router
const router = express.Router();

router.get('/user', user);
router.get('/user/events', usersEvents);

router.get('/users', allUsers);
router.get('/users/:id', findUser);
router.put('/users/:id', updateUser);
router.put('/users/:id/link_to_untis', linkToUntis);
router.put('/users/:id/set_role', setRole);
router.post('/users/:id/create_ics', createIcs);
router.get('/users/:id/affected-event-ids', affectedEventIds);


router.get('/events', allEvents);
router.post('/events/excel', exportExcel);
router.get('/events/:id', findEvent);
router.put('/events/:id', updateEvent);
router.post('/events/:id/clone', cloneEvent);
router.post('/events/change_state', setEventState);
router.delete('/events/:id', deleteEvent);
router.post('/events', createEvent);

const upload = multer({ dest: `${UPLOAD_DIR}/` })
router.post('/events/import', upload.single('terminplan'), importEvents);


router.get('/jobs', allJobs);
router.get('/jobs/:id', findJob);
router.put('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);

router.get('/untis/teachers', teachers);
router.get('/untis/teachers/:id', teacher);
router.get('/untis/classes', classes);
router.get('/untis/subjects', subjects);

router.get('/departments', allDepartments);
router.get('/departments/:id', findDepartment);
router.put('/departments/:id', updateDepartment);
router.post('/departments', createDepartment);
router.delete('/departments/:id', deleteDepartment);


router.get('/semesters', allSemesters);
router.get('/semesters/:id', findSemester);
router.post('/semesters/:id/sync_untis', sync);
router.put('/semesters/:id', updateSemester);
router.delete('/semesters/:id', deleteSemester);
router.post('/semesters', createSemester);

router.get('/registration_periods', allRegistrationPeriods);
router.get('/registration_periods/:id', findRegistrationPeriod);
router.put('/registration_periods/:id', updateRegistrationPeriod);
router.delete('/registration_periods/:id', deleteRegistrationPeriod);
router.post('/registration_periods', createRegistrationPeriod);

router.get('/event_groups', usersEventGroup)
router.post('/event_groups', createEventGroup)
router.get('/event_groups/:id', findEventGroup)
router.put('/event_groups/:id', updateEventGroup)
router.delete('/event_groups/:id', deleteEventGroup)
router.get('/event_groups/:id/events', eventsFromEventGroup)
router.post('/event_groups/:id/clone', cloneEventGroup)


export default router;