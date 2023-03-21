import { Role } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { AccessMatrix, PUBLIC_ROUTES } from "../routes/authConfig";

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
    console.log(rules);
    return rules;
}

const routeGuard = (accessMatrix: AccessRegexRule[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user && !PUBLIC_ROUTES.includes(req.path.toLowerCase())) {
            return res.status(403).json({ error: 'No roles claim found!' });
        }

        if (!requestHasRequiredAttributes(accessMatrix, req.path, req.method, req.user?.role || 'PUBLIC')) {
            return res.status(403).json({ error: 'User does not have the role, method or path' });
        }

        next();
    };
};


/**
 * This method checks if the request has the correct roles, paths and methods
 */
const requestHasRequiredAttributes = (accessMatrix: AccessRegexRule[], path: string, method: string, role: Role | 'PUBLIC') => {
    if (role === 'PUBLIC') {
        return method === 'GET';
    }
    const accessRules = Object.values(accessMatrix);
    const accessRule = accessRules.find((accessRule) => accessRule.regex.test(path));
    if (!accessRule) {
        // console.log('has No Role', role, method, path)
        return false;
    }
    const hasRole = accessRule.access.some(
        (rule) => rule.roles.includes(role) && rule.methods.includes(method as 'GET' | 'POST' | 'PUT' | 'DELETE')
    );
    // console.log('hasRole', hasRole, role, method, path)
    return hasRole;
};

export default routeGuard;