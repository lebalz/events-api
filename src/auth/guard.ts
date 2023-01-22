import { Role, User } from "@prisma/client";
import express, { Request, Response, NextFunction } from "express";
import { AccessMatrix } from "../routes/authConfig";

const routeGuard = (accessMatrix: AccessMatrix) => {
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
const requestHasRequiredAttributes = (accessMatrix: AccessMatrix, path: string, method: string, role: Role) => {
    const accessRules = Object.values(accessMatrix);

    /** TODO: Make sure, the more fingrained matches matter most */
    const accessRule = accessRules
        .find((accessRule) => path.includes(accessRule.path));
    if (!accessRule) {
        return false;
    }
    const hasRole = accessRule.access.some(
        (rule) => rule.roles.includes(role) && rule.methods.includes(method as 'GET' | 'POST' | 'PUT' | 'DELETE')
    );
    return hasRole;
};

export default routeGuard;