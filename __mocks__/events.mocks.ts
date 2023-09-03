import { Department, Event, EventState, Prisma, TeachingAffected } from "@prisma/client";
import { prismaMock } from "./singleton";
import { v4 as uuidv4 } from 'uuid';
import prisma from "../src/prisma";

export const getMockProps = (authorId: string, props: Partial<Prisma.EventUncheckedCreateInput>) => {
	return {
		id: props.id || uuidv4(),
		authorId: authorId,
		cloned: props.cloned || false,
		description: props.description || '',
		descriptionLong: props.descriptionLong || '',
		start: props.start as Date || new Date(),
		end: props.end as Date || new Date(),
		klpOnly: props.klpOnly || false,
		location: props.location || '',
		parentId: props.parentId || null,
		state: props.state || EventState.DRAFT,
		teachersOnly: props.teachersOnly || false,
		teachingAffected: props.teachingAffected || TeachingAffected.NO,
		userGroupId: props.userGroupId || null,
		classes: props.classes as string[] || [],
		classGroups: props.classGroups as string[] || [],
		subjects: props.subjects as string[] || [],
		jobId: props.jobId,
		createdAt: props.createdAt as Date || new Date(),
		updatedAt: props.updatedAt as Date || new Date(),
		deletedAt: props.deletedAt as Date || null
	} as Event;
}

export const createMocks = (_events: Event[], _departments?: Department[], _event2department?: [string, string[]][]) => {
	const events = _events.map(e => ({ ...e }));
	const departments = _departments?.map(d => ({ ...d })) || [];
	const event2department = new Map<string, string[]>(_event2department || []);

	const handleRelations = (event: Event, include?: Prisma.EventInclude | null) => {
		const ret = { ...event }
		if (!include) {
			return ret
		};
		if (include.departments) {
			if (event2department.has(event.id)) {
				(ret as any).departments = event2department.get(event.id)!	/** get department ids */
					.map(d => departments.find((p) => d === p.id))			/** find department */
					.filter(d => !!d) 										/** filter not found departments */
					.map((d) => ({ ...d })); 								/** clone department */
			} else {
				(ret as any).departments = [];
			}
		}
		if (include.children) {
			(ret as any).children = events.filter(e => e.parentId === ret.id).map(e => ({ ...e }));
		}
		return ret;
	}
	/** mock update */
	prismaMock.event.update.mockImplementation(((args: Prisma.EventUpdateArgs) => {
		if (!args.where.id) {
			throw new Error('Missing id');
		}
		const idx = events.findIndex(e => e.id === args.where.id);

		(Object.keys(args.data) as (keyof typeof args.data)[]).forEach((key) => {
			if (key === 'departments') {
				if (args.data[key]?.connect || args.data[key]?.set) {
					const connect = (args.data[key]!.connect || args.data[key]?.set) as Prisma.DepartmentWhereUniqueInput[];
					event2department.set(args.where.id!, connect.map((d) => (d as { id: string }).id));
				} else {
					throw new Error(`Not implemented: ${JSON.stringify(args.data.departments)}`);
				}
			}
			(events[idx] as any)[key] = (args.data as any)[key];
		});
		return handleRelations(events[idx], args.include);
	}) as unknown as typeof prisma.event.update);

	/** mock find event */
	prismaMock.event.findUnique.mockImplementation(((args: Prisma.EventFindUniqueArgs) => {
		const event = events.find(e => e.id === args.where.id);
		if (event) {
			return handleRelations(event, args.include);
		}
		return null;
	}) as unknown as typeof prisma.event.findUnique);

	/** mock delete event */
	prismaMock.event.delete.mockImplementation(((args: Prisma.EventDeleteArgs) => {
		const idx = events.findIndex(e => e.id === args.where.id);
		if (idx >= 0) {
			const event = events.splice(idx, 1)[0];
			return handleRelations(event, args.include);
		}
		return null;
	}) as unknown as typeof prisma.event.delete);

	/** mock create event */
	prismaMock.event.create.mockImplementation(((args: Prisma.EventCreateArgs) => {
		const id = args.data.id || `event-${events.length + 1}`
		const event = events.find(e => e.id === id);
		if (event) {
			throw new Error('Event already exists');
		}
		const newEvent = getMockProps(args.data.authorId || 'unknown', { ...args.data, id: id });
		events.push(newEvent);
		
		if (args.data.departments?.connect) {
			const connect = args.data.departments.connect as Prisma.DepartmentWhereUniqueInput[];
			event2department.set(id, connect.map((d) => (d as { id: string }).id));
		} else {
			throw new Error(`Not implemented: ${JSON.stringify(args.data.departments)}`);
		}
		return handleRelations(newEvent, args.include);
	}) as unknown as typeof prisma.event.create);

	/** mock findMany event */
	prismaMock.event.findMany.mockImplementation(((args: Prisma.EventFindManyArgs) => {
		const isIncluded = (e: Event, whereArgs: Prisma.EventWhereInput): boolean => {
			let isIn = true;
			Object.keys(whereArgs).forEach((key) => {
				if (isIn && key in e) {
					if ((e as any)[key] !== (whereArgs as any)[key]) {
						isIn = false;
					}
				}
			});
			if (!isIn) {
				return false;
			}
			if (whereArgs.OR) {
				isIn = whereArgs.OR.some((or) => isIncluded(e, or));
				return isIn;
			}
			if (whereArgs.AND) {
				const whereArgsAND = whereArgs.AND as Prisma.EventWhereInput[];
				isIn = whereArgsAND.every((and) => isIncluded(e, and));
				return isIn;
			}
			if (whereArgs.NOT) {
				const whereArgsNOT = whereArgs.NOT as Prisma.EventWhereInput[];
				isIn = whereArgsNOT.every((not) => isIncluded(e, not));
				return isIn;
			}
			return true;
		};

		const ret = events.filter(u => {
			if (args.where) {
				return isIncluded(u, args.where);
			}
			return true;
		});
		return ret.map(e => handleRelations(e, args.include));
	}) as unknown as typeof prisma.event.findMany);
}