import { Role, User } from "@prisma/client";
import express, { Request, Response, NextFunction } from "express";
import { AccessMatrix } from "../routes/authConfig";

interface AccessRegexRule {
    path: RegExp;
    parts: number;
    access: {
        methods: ("GET" | "POST" | "PUT" | "DELETE")[];
        roles: Role[];
    }[];
}

export const createAccessRules = (accessMatrix: AccessMatrix): AccessRegexRule[] => {
    const accessRules = Object.values(accessMatrix);
    const accessRulesWithRegex = accessRules.map((accessRule) => {
        const parts = accessRule.path.split('/');
        const path = parts.map((part, idx) => {
            if (part.startsWith(':')) {
                return '[^\\/]+';
            }
            return part;
        }).join('\\/');

        const regex = new RegExp(`^${path}`, 'i');
        return {
            ...accessRule,
            path: regex,
            parts: parts.length
        }
    });
    const rules = accessRulesWithRegex.sort((a, b) => b.parts - a.parts);
    Object.freeze(rules);
    return rules;
}

const routeGuard = (accessMatrix: AccessRegexRule[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(403).json({ error: 'No roles claim found!' });
        }

        if (!requestHasRequiredAttributes(accessMatrix, req.path, req.method, req.user.role)) {
            return res.status(403).json({ error: 'User does not have the role, method or path' });
        }

        next();
    };
};


/**
 * This method checks if the request has the correct roles, paths and methods
 */
const requestHasRequiredAttributes = (accessMatrix: AccessRegexRule[], path: string, method: string, role: Role) => {
    const accessRules = Object.values(accessMatrix);
    const accessRule = accessRules.find((accessRule) => accessRule.path.test(path));
    if (!accessRule) {
        return false;
    }
    const hasRole = accessRule.access.some(
        (rule) => rule.roles.includes(role) && rule.methods.includes(method as 'GET' | 'POST' | 'PUT' | 'DELETE')
    );
    return hasRole;
};

export default routeGuard;