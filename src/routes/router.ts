import express from 'express';
import { create as createEvent, events } from '../controllers/event';
import { get as getUntis } from '../controllers/untis';
import { user, users } from '../controllers/user';

// initialize router
const router = express.Router();

router.get('/user', user);
router.get('/user/all', users);


router.get('/event/all', events);
router.post('/event', createEvent);

router.get('/untis', getUntis);



// router.get('/dashboard', dashboard.getAllTodos);

// router.get('/todolist', todolist.getTodos);

// router.get('/todolist/:id', todolist.getTodo);

// router.post('/todolist', todolist.postTodo);

// router.put('/todolist/:id', todolist.updateTodo);

// router.delete('/todolist/:id', todolist.deleteTodo);

export default router;