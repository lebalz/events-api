import type { Role } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { AccessMatrix, PUBLIC_POST_ROUTES, PUBLIC_ROUTES } from "../routes/authConfig";
import Logger from "../utils/logger";
import { HttpStatusCode } from "../utils/errors/BaseError";

interface AccessRegexRule {
    path: string;
    regex: RegExp;
    weight: number;
    access: {
        methods: ("GET" | "POST" | "PUT" | "DELETE")[];
        roles: Role[];
    }[];
}

export const createAccessRules = (accessMatrix: AccessMatrix): AccessRegexRule[] => {
    const accessRules = Object.values(accessMatrix);
    const maxParts = accessRules.reduce((max, accessRule) => { return Math.max(max, accessRule.path.split('/').length) }, 0);
    const accessRulesWithRegex = accessRules.map((accessRule) => {
        const parts = accessRule.path.split('/');
        let wildcards = 0
        let weight = 0;
        const path = parts.map((part, idx) => {
            if (part.startsWith(':')) {
                weight += 2 ** ((maxParts - idx) * 2 - 1); 
                return '[^\\/]+';
            } else {
                weight += 2 ** ((maxParts - idx) * 2); 
            }
            return part;
        }).join('\\/');

        const regex = new RegExp(`^${path}`, 'i');
        return {
            ...accessRule,
            path: accessRule.path.toLowerCase(),
            regex: regex,
            weight: weight
        }
    });
    const rules = accessRulesWithRegex.sort((a, b) => b.weight - a.weight);
    Object.freeze(rules);
    Logger.info('Access Rules created');
    return rules;
}

const routeGuard = (accessMatrix: AccessRegexRule[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user && ![...PUBLIC_ROUTES, ...PUBLIC_POST_ROUTES].includes(req.path.toLowerCase())) {
            return res.status(HttpStatusCode.FORBIDDEN).json({ error: 'No roles claim found!' });
        }

        if (!requestHasRequiredAttributes(accessMatrix, req.path, req.method, req.user?.role || 'PUBLIC')) {
            return res.status(HttpStatusCode.FORBIDDEN).json({ error: 'User does not have the role, method or path' });
        }

        next();
    };
};


/**
 * This method checks if the request has the correct roles, paths and methods
 */
const requestHasRequiredAttributes = (accessMatrix: AccessRegexRule[], path: string, method: string, role: Role | 'PUBLIC') => {
    if (role === 'PUBLIC') {
        if (PUBLIC_POST_ROUTES.includes(path.toLowerCase())) {
            return method === 'POST';
        }
        return method === 'GET';
    }
    const accessRules = Object.values(accessMatrix);
    const accessRule = accessRules.filter((accessRule) => accessRule.regex.test(path)).sort((a, b) => b.path.length - a.path.length)[0];
    if (!accessRule) {
        return false;
    }
    const hasRole = accessRule.access.some(
        (rule) => rule.roles.includes(role) && rule.methods.includes(method as 'GET' | 'POST' | 'PUT' | 'DELETE')
    );
    return hasRole;
};

export default routeGuard;